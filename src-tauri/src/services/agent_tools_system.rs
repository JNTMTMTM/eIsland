/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

use crate::windows::Result;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Map, Value};
use std::{io::Cursor, path::PathBuf, process::Stdio, time::Duration};
use tauri::AppHandle;
use tokio::{io::AsyncReadExt, process::Command};
fn string<'a>(args: &'a Value, key: &str) -> &'a str {
    args[key].as_str().unwrap_or("").trim()
}
fn required<'a>(args: &'a Value, key: &str) -> Result<&'a str> {
    let value = string(args, key);
    if value.is_empty() {
        Err(format!("Missing {key}"))
    } else {
        Ok(value)
    }
}
fn number(args: &Value, key: &str, fallback: f64) -> f64 {
    args[key]
        .as_f64()
        .filter(|v| v.is_finite())
        .unwrap_or(fallback)
}
fn optional(value: &str) -> Value {
    if value.is_empty() {
        Value::Null
    } else {
        json!(value)
    }
}
fn windows() -> Result<()> {
    if cfg!(windows) {
        Ok(())
    } else {
        Err("This system tool requires Windows".into())
    }
}
async fn command(executable: &str, args: &[&str], allow_failure: bool) -> Result<String> {
    let mut command = Command::new(executable);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    let mut stdout = child.stdout.take().unwrap().take(8 * 1024 * 1024 + 1);
    let mut stderr = child.stderr.take().unwrap().take(64 * 1024 + 1);
    let operation = async {
        let mut output = Vec::new();
        let mut errors = Vec::new();
        let (first, second) = tokio::join!(
            stdout.read_to_end(&mut output),
            stderr.read_to_end(&mut errors)
        );
        first.map_err(|e| e.to_string())?;
        second.map_err(|e| e.to_string())?;
        if output.len() > 8 * 1024 * 1024 || errors.len() > 64 * 1024 {
            return Err("System tool output limit exceeded".into());
        }
        let status = child.wait().await.map_err(|e| e.to_string())?;
        if !status.success() && !allow_failure {
            return Err(String::from_utf8_lossy(&errors).trim().to_owned());
        }
        let output = String::from_utf8_lossy(&output).trim().to_owned();
        Ok(if output.is_empty() && allow_failure {
            String::from_utf8_lossy(&errors).trim().to_owned()
        } else {
            output
        })
    };
    match tokio::time::timeout(Duration::from_secs(35), operation).await {
        Ok(value) => value,
        Err(_) => {
            let _ = child.kill().await;
            Err("System tool timed out".into())
        }
    }
}
/// Execute a fixed operating-system action; user values are JSON data, never shell source.
async fn powershell(script: &str, args: &Value) -> Result<Value> {
    windows()?;
    let payload = STANDARD.encode(serde_json::to_vec(args).map_err(|e| e.to_string())?);
    let source=format!("$ErrorActionPreference='Stop'; [Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false); $a=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{payload}'))|ConvertFrom-Json; $result=& {{ {script} }}; ConvertTo-Json -InputObject $result -Depth 20 -Compress");
    let bytes = source
        .encode_utf16()
        .flat_map(u16::to_le_bytes)
        .collect::<Vec<_>>();
    let output = command(
        "powershell.exe",
        &[
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-EncodedCommand",
            &STANDARD.encode(bytes),
        ],
        false,
    )
    .await?;
    if output.is_empty() {
        Ok(Value::Null)
    } else {
        serde_json::from_str(output.trim_start_matches('\u{feff}'))
            .map_err(|_| "Invalid system tool JSON response".into())
    }
}
fn recognized(tool: &str) -> bool {
    matches!(
        tool,
        "sys.info"
            | "sys.env"
            | "sys.open"
            | "sys.installed-apps"
            | "sys.launch"
            | "sys.nowplaying"
            | "win.list"
            | "win.minimize"
            | "win.maximize"
            | "win.restore"
            | "win.close"
            | "win.screenshot"
            | "clipboard.read"
            | "clipboard.write"
            | "notification.send"
            | "net.ping"
            | "net.dns"
            | "net.ports"
            | "net.proxy"
            | "net.hosts"
            | "monitor.cpu"
            | "monitor.memory"
            | "monitor.disk"
            | "monitor.gpu"
            | "volume.get"
            | "volume.set"
            | "brightness.get"
            | "brightness.set"
            | "display.list"
            | "power.sleep"
            | "power.shutdown"
            | "power.restart"
            | "wifi.list"
            | "registry.read"
            | "registry.write"
            | "registry.delete"
            | "service.list"
            | "service.start"
            | "service.stop"
            | "service.restart"
            | "schedule.task.list"
            | "schedule.task.create"
            | "firewall.rules"
            | "defender.scan"
    )
}
pub async fn execute(app: &AppHandle, tool: &str, args: &Value) -> Option<Result<Value>> {
    if !recognized(tool) {
        return None;
    }
    Some(run(app, tool, args).await)
}

async fn run(app: &AppHandle, tool: &str, args: &Value) -> Result<Value> {
    match tool{
        "sys.env"=>{
            let name=string(args,"name");if !name.is_empty(){return Ok(json!({"name":name,"value":std::env::var(name).ok()}));}
            let filter=string(args,"filter").to_lowercase();let mut values=std::env::vars().filter(|(key,_)|filter.is_empty()||key.to_lowercase().contains(&filter)).collect::<Vec<_>>();values.sort_by(|a,b|a.0.cmp(&b.0));let total=values.len();let limit=number(args,"limit",50.).floor().clamp(1.,200.) as usize;let values:Map<String,Value>=values.into_iter().take(limit).map(|(key,value)|(key,json!(value))).collect();Ok(json!({"count":values.len(),"totalMatched":total,"variables":values}))
        }
        "sys.info"|"monitor.memory"=>{
            let tool=tool.to_owned();tauri::async_runtime::spawn_blocking(move||{
                let system=sysinfo::System::new_all();let total=(system.total_memory() as f64/1048576.).round();let free=(system.free_memory() as f64/1048576.).round();
                if tool=="monitor.memory"{return Ok(json!({"totalMB":total,"freeMB":free,"usedMB":total-free,"usagePercent":if total>0.{((total-free)/total*100.).round()}else{0.}}));}
                Ok(json!({"platform":if cfg!(windows){"win32"}else{std::env::consts::OS},"arch":match std::env::consts::ARCH{"x86_64"=>"x64","aarch64"=>"arm64","x86"=>"ia32",value=>value},"release":sysinfo::System::os_version().unwrap_or_default(),"hostname":sysinfo::System::host_name().unwrap_or_default(),"homedir":std::env::var("USERPROFILE").or_else(|_|std::env::var("HOME")).unwrap_or_default(),"tmpdir":std::env::temp_dir(),"cpuModel":system.cpus().first().map(|cpu|cpu.brand()).unwrap_or("unknown"),"cpuCores":system.cpus().len(),"totalMemoryMB":total,"freeMemoryMB":free,"uptime":sysinfo::System::uptime(),"userInfo":{"username":std::env::var("USERNAME").or_else(|_|std::env::var("USER")).unwrap_or_default(),"uid":-1,"gid":-1}}))
            }).await.map_err(|e|e.to_string())?
        }
        "sys.nowplaying"=>{
            let info=crate::services::media::handle(app,"media:current-info:get",&[]).await?;
            if info.is_null(){return Ok(json!({"playing":false,"message":"当前没有正在播放的媒体"}));}
            let mut result=json!({"playing":true});for key in ["title","artist","album","isPlaying","duration_ms","position_ms","deviceId"]{result[key]=info[key].clone();}Ok(result)
        }
        "sys.open"=>{
            let target=required(args,"target")?.to_lowercase();let target=target.as_str();
            let (executable,uri,label)=builtin_target(target).ok_or_else(||format!("Unsupported system target: {target}"))?;
            if !uri.is_empty(){powershell("Start-Process -FilePath ([string]$a.uri)|Out-Null; $true",&json!({"uri":uri})).await?;}
            else{let mut command=std::process::Command::new(if executable.ends_with(".msc"){"mmc.exe"}else{executable});if executable.ends_with(".msc"){command.arg(executable);}
            if target=="explorer"&&!string(args,"path").is_empty(){command.arg(string(args,"path"));}#[cfg(windows)]{use std::os::windows::process::CommandExt;command.creation_flags(0x08000000);}command.spawn().map_err(|e|e.to_string())?;}
            Ok(json!({"target":target,"label":label,"opened":true}))
        }
        "sys.launch"=>{
            if string(args,"target").is_empty()&&string(args,"app").is_empty(){return Err("sys.launch requires target or app".into());}
            powershell("if($a.app){if($a.target){Start-Process -FilePath ([string]$a.app) -ArgumentList @([string]$a.target) -WindowStyle Hidden | Out-Null}else{Start-Process -FilePath ([string]$a.app) -WindowStyle Hidden | Out-Null}}else{Start-Process -FilePath ([string]$a.target) -WindowStyle Hidden | Out-Null};$true",args).await?;
            Ok(json!({"launched":if string(args,"target").is_empty(){string(args,"app")}else{string(args,"target")},"app":optional(string(args,"app"))}))
        }
        "sys.installed-apps"=>{
            let payload=json!({"filter":string(args,"filter"),"limit":number(args,"limit",200.).floor().clamp(1.,500.)});
            let apps=powershell(r#"$apps=@(Get-ItemProperty -Path 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*','HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object {$_.DisplayName -and (!$a.filter -or $_.DisplayName.ToLower().Contains(([string]$a.filter).ToLower()) -or ([string]$_.Publisher).ToLower().Contains(([string]$a.filter).ToLower()))} | Sort-Object DisplayName | Select-Object -First $a.limit @{N='name';E={$_.DisplayName}},@{N='version';E={$_.DisplayVersion}},@{N='publisher';E={$_.Publisher}},@{N='installDate';E={$_.InstallDate}},@{N='installLocation';E={$_.InstallLocation}});@{filter=$a.filter;count=$apps.Count;apps=$apps}"#,&payload).await?;Ok(apps)
        }
        "win.list"|"win.minimize"|"win.maximize"|"win.restore"|"win.close"=>window_tool(app,tool,args).await,
        "win.screenshot"=>{
            let path=PathBuf::from(required(args,"savePath")?);
            tauri::async_runtime::spawn_blocking(move||{if let Some(parent)=path.parent(){std::fs::create_dir_all(parent).map_err(|e|e.to_string())?;}let monitors=xcap::Monitor::all().map_err(|e|e.to_string())?;let monitor=monitors.iter().find(|monitor|monitor.is_primary().unwrap_or(false)).or_else(||monitors.first()).ok_or("No screen available")?;let screenshot=monitor.capture_image().map_err(|e|e.to_string())?;screenshot.save(&path).map_err(|e|e.to_string())?;Ok(json!({"path":path,"size":std::fs::metadata(&path).map_err(|e|e.to_string())?.len(),"fileName":path.file_name().map(|name|name.to_string_lossy())}))}).await.map_err(|e|e.to_string())?
        }
        "clipboard.read"=>tauri::async_runtime::spawn_blocking(||{let mut clipboard=arboard::Clipboard::new().map_err(|e|e.to_string())?;let text=clipboard.get_text().ok();let image=clipboard.get_image().ok();let mut result=json!({"text":text,"hasImage":image.is_some()});if let Some(image)=image{let width=image.width;let height=image.height;let image=image::RgbaImage::from_raw(width as u32,height as u32,image.bytes.to_vec()).ok_or("Invalid clipboard image")?;let mut buffer=Cursor::new(Vec::new());image::DynamicImage::ImageRgba8(image).write_to(&mut buffer,image::ImageFormat::Png).map_err(|e|e.to_string())?;let bytes=buffer.into_inner();result["imageBase64"]=json!(STANDARD.encode(&bytes));result["imageSize"]=json!(bytes.len());result["imageWidth"]=json!(width);result["imageHeight"]=json!(height);}Ok(result)}).await.map_err(|e|e.to_string())?,
        "clipboard.write"=>{let text=required(args,"text")?.to_owned();tauri::async_runtime::spawn_blocking(move||{arboard::Clipboard::new().map_err(|e|e.to_string())?.set_text(&text).map_err(|e|e.to_string())?;Ok(json!({"written":true,"length":text.chars().count()}))}).await.map_err(|e|e.to_string())?},
        "notification.send"=>{
            required(args,"body")?;let title=if string(args,"title").is_empty(){"eIsland Agent"}else{string(args,"title")};
            powershell(r#"[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]|Out-Null;[Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom.XmlDocument,ContentType=WindowsRuntime]|Out-Null;$doc=New-Object Windows.Data.Xml.Dom.XmlDocument;$title=[Security.SecurityElement]::Escape([string]$a.title);$body=[Security.SecurityElement]::Escape([string]$a.body);$doc.LoadXml('<toast><visual><binding template="ToastGeneric"><text>'+$title+'</text><text>'+$body+'</text></binding></visual></toast>');$toast=[Windows.UI.Notifications.ToastNotification]::new($doc);[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('eIsland').Show($toast);$true"#,&json!({"title":title,"body":string(args,"body")})).await?;Ok(json!({"title":title,"body":string(args,"body"),"sent":true}))
        }
        "net.ping"=>{windows()?;let host=required(args,"host")?;if host.starts_with('-'){return Err("Invalid host".into());}let count=number(args,"count",4.).floor().clamp(1.,10.) as u32;let output=command("ping.exe",&["-n",&count.to_string(),host],true).await?;Ok(json!({"host":host,"count":count,"output":output}))},
        "net.dns"=>{let host=required(args,"host")?;Ok(json!({"host":host,"records":powershell("@(Resolve-DnsName -Name ([string]$a.host) | Select-Object Name,Type,IPAddress,NameHost)",args).await?}))},
        "net.ports"=>Ok(json!({"filter":optional(string(args,"filter")),"ports":powershell("@(Get-NetTCPConnection -State Listen | Where-Object {!$a.filter -or ([string]$_.LocalPort) -eq ([string]$a.filter) -or ([string]$_.OwningProcess) -eq ([string]$a.filter)} | Select-Object -First 50 LocalAddress,LocalPort,OwningProcess,@{N='ProcessName';E={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}})",args).await?})),
        "monitor.cpu"=>powershell("@(Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,LoadPercentage)",args).await,
        "monitor.disk"=>Ok(json!({"disks":powershell("@(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,VolumeName,@{N='SizeGB';E={[math]::Round($_.Size/1GB,2)}},@{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,2)}},@{N='UsedGB';E={[math]::Round(($_.Size-$_.FreeSpace)/1GB,2)}},@{N='UsagePercent';E={if($_.Size){[math]::Round(($_.Size-$_.FreeSpace)/$_.Size*100,1)}else{0}}})",args).await?})),
        "monitor.gpu"=>powershell("@(Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion,VideoProcessor,CurrentHorizontalResolution,CurrentVerticalResolution)",args).await,
        "volume.get"=>Ok(json!({"level":crate::services::hardware::handle(app,"system:volume:get",&[]).await?,"muted":crate::services::hardware::handle(app,"media:get-muted",&[]).await?})),
        "volume.set"=>{let level=args["level"].as_f64().filter(|v|v.is_finite()).ok_or("Missing level")?.floor().clamp(0.,100.);let success=crate::services::hardware::handle(app,"system:volume:set",&[json!(level)]).await?;if success!=true{return Err("Volume device unavailable".into());}Ok(json!({"level":level,"set":true}))},
        "brightness.get"=>Ok(json!({"brightness":crate::services::hardware::handle(app,"system:brightness:get",&[]).await?})),
        "brightness.set"=>{let level=args["level"].as_f64().filter(|v|v.is_finite()).ok_or("Missing level")?.floor().clamp(0.,100.);let success=crate::services::hardware::handle(app,"system:brightness:set",&[json!(level)]).await?;if success!=true{return Err("Brightness device unavailable".into());}Ok(json!({"brightness":level,"set":true}))},
        "display.list"=>Ok(json!({"displays":powershell("@(Get-CimInstance Win32_VideoController | Select-Object Name,CurrentHorizontalResolution,CurrentVerticalResolution,CurrentRefreshRate)",args).await?})),
        "power.sleep"|"power.shutdown"|"power.restart"=>{windows()?;let action=tool.trim_start_matches("power.");if action=="sleep"{command("rundll32.exe",&["powrprof.dll,SetSuspendState","0,1,0"],false).await?;}else{command("shutdown.exe",&[if action=="shutdown"{"/s"}else{"/r"},"/t","5","/c","eIsland Agent"],false).await?;}Ok(json!({"action":action,"initiated":true}))},
        "wifi.list"=>{windows()?;Ok(json!({"output":command("netsh.exe",&["wlan","show","networks","mode=bssid"],false).await?}))},
        "registry.read"|"registry.write"|"registry.delete"=>registry(tool,args).await,
        "service.list"=>Ok(json!({"filter":optional(string(args,"filter")),"services":powershell("@(Get-Service | Where-Object {!$a.filter -or $_.Name.ToLower().Contains(([string]$a.filter).ToLower()) -or $_.DisplayName.ToLower().Contains(([string]$a.filter).ToLower())} | Select-Object -First 50 Name,DisplayName,Status,StartType)",args).await?})),
        "service.start"|"service.stop"|"service.restart"=>{let name=required(args,"name")?;let action=tool.trim_start_matches("service.");let script=match action{"start"=>"Start-Service -Name ([string]$a.name) -PassThru | Select-Object Name,Status","stop"=>"Stop-Service -Name ([string]$a.name) -Force -PassThru | Select-Object Name,Status",_=>"Restart-Service -Name ([string]$a.name) -Force -PassThru | Select-Object Name,Status"};Ok(json!({"name":name,"action":action,"service":powershell(script,args).await?}))},
        "schedule.task.list"=>Ok(json!({"filter":optional(string(args,"filter")),"tasks":powershell("@(Get-ScheduledTask | Where-Object {!$a.filter -or $_.TaskName.ToLower().Contains(([string]$a.filter).ToLower())} | Select-Object -First 50 TaskName,State,TaskPath)",args).await?})),
        "schedule.task.create"=>{
            let name=required(args,"name")?;let source=required(args,"command")?;let trigger=if string(args,"trigger").is_empty(){"Once"}else{string(args,"trigger")};if !matches!(trigger,"Once"|"Daily"|"Weekly"|"AtStartup"|"AtLogOn"){return Err("Invalid task trigger".into());}
            let mut payload=args.clone();payload["trigger"]=json!(trigger);payload["encodedCommand"]=json!(STANDARD.encode(source.encode_utf16().flat_map(u16::to_le_bytes).collect::<Vec<_>>()));
            let task=powershell("$action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand '+$a.encodedCommand);$at=if($a.time){[datetime]::Parse([string]$a.time)}else{(Get-Date).AddMinutes(5)};$trigger=switch($a.trigger){'Once'{New-ScheduledTaskTrigger -Once -At $at}'Daily'{New-ScheduledTaskTrigger -Daily -At $at}'Weekly'{New-ScheduledTaskTrigger -Weekly -DaysOfWeek $at.DayOfWeek -At $at}'AtStartup'{New-ScheduledTaskTrigger -AtStartup}'AtLogOn'{New-ScheduledTaskTrigger -AtLogOn}};Register-ScheduledTask -TaskName ([string]$a.name) -Action $action -Trigger $trigger -Force | Select-Object TaskName,State",&payload).await?;Ok(json!({"name":name,"command":source,"trigger":trigger,"task":task}))
        }
        "net.proxy"=>{
            let action=if string(args,"action").is_empty(){"get"}else{string(args,"action")};
            if action=="get"{return Ok(json!({"action":action,"proxy":powershell(r#"Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' | Select-Object ProxyEnable,ProxyServer,ProxyOverride"#,args).await?}));}
            let server=string(args,"server");let enabled=action=="set"&&!server.is_empty();powershell(r#"$path='HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings';$enabled=if($a.action -eq 'set' -and $a.server){1}else{0};Set-ItemProperty -LiteralPath $path -Name ProxyEnable -Value $enabled;if($a.server){Set-ItemProperty -LiteralPath $path -Name ProxyServer -Value ([string]$a.server)};$true"#,args).await?;Ok(json!({"action":action,"server":server,"enabled":enabled}))
        }
        "net.hosts"=>{
            let path=PathBuf::from(std::env::var_os("SystemRoot").unwrap_or_else(||"C:\\Windows".into())).join("System32/drivers/etc/hosts");let action=if string(args,"action").is_empty(){"read"}else{string(args,"action")};
            if action=="read"{let content=std::fs::read_to_string(&path).map_err(|e|e.to_string())?;return Ok(json!({"path":path,"content":content}));}
            let ip=required(args,"ip")?;ip.parse::<std::net::IpAddr>().map_err(|_|"Invalid hosts IP address")?;let host=required(args,"host")?;if host.chars().any(|c|c.is_whitespace()||c.is_control()||c=='#'){return Err("Invalid hosts name".into());}let entry=format!("{ip} {host}");let mut file=std::fs::OpenOptions::new().append(true).open(&path).map_err(|e|e.to_string())?;std::io::Write::write_all(&mut file,format!("\r\n{entry}\r\n").as_bytes()).map_err(|e|e.to_string())?;Ok(json!({"action":"add","entry":entry,"added":true}))
        }
        "firewall.rules"=>Ok(json!({"filter":optional(string(args,"filter")),"rules":powershell("@(Get-NetFirewallRule | Where-Object {!$a.filter -or $_.DisplayName.ToLower().Contains(([string]$a.filter).ToLower())} | Select-Object -First 30 DisplayName,Direction,Action,Enabled)",args).await?})),
        "defender.scan"=>{let kind=if string(args,"type").is_empty(){"QuickScan"}else{string(args,"type")};if !matches!(kind,"QuickScan"|"FullScan"|"CustomScan"){return Err("Invalid Defender scan type".into());}powershell("if($a.path){Start-MpScan -ScanType ([string]$a.type) -ScanPath ([string]$a.path)}else{Start-MpScan -ScanType ([string]$a.type)};$true",&json!({"type":kind,"path":string(args,"path")})).await?;Ok(json!({"scanType":kind,"initiated":true}))},
        _=>Err("Unknown system tool".into()),
    }
}

fn builtin_target(target: &str) -> Option<(&str, &str, &str)> {
    let value = match target {
        "explorer" => ("explorer.exe", "", "文件资源管理器"),
        "control" => ("control.exe", "", "控制面板"),
        "taskmgr" => ("taskmgr.exe", "", "任务管理器"),
        "devmgr" => ("devmgmt.msc", "", "设备管理器"),
        "diskmgmt" => ("diskmgmt.msc", "", "磁盘管理"),
        "services" => ("services.msc", "", "服务管理"),
        "regedit" => ("regedit.exe", "", "注册表编辑器"),
        "notepad" => ("notepad.exe", "", "记事本"),
        "calc" => ("calc.exe", "", "计算器"),
        "paint" => ("mspaint.exe", "", "画图"),
        "terminal" => ("wt.exe", "", "Windows Terminal"),
        "snip" => ("snippingtool.exe", "", "截图工具"),
        "settings" => ("", "ms-settings:", "Windows 设置"),
        "display" => ("", "ms-settings:display", "显示设置"),
        "sound" => ("", "ms-settings:sound", "声音设置"),
        "bluetooth" => ("", "ms-settings:bluetooth", "蓝牙设置"),
        "wifi" => ("", "ms-settings:network-wifi", "Wi-Fi 设置"),
        "network" => ("", "ms-settings:network-status", "网络状态"),
        "proxy" => ("", "ms-settings:network-proxy", "代理设置"),
        "apps" => ("", "ms-settings:appsfeatures", "应用和功能"),
        "defaultapps" => ("", "ms-settings:defaultapps", "默认应用"),
        "storage" => ("", "ms-settings:storagesense", "存储设置"),
        "power" => ("", "ms-settings:powersleep", "电源和睡眠"),
        "about" => ("", "ms-settings:about", "系统信息"),
        "update" => ("", "ms-settings:windowsupdate", "Windows 更新"),
        "datetime" => ("", "ms-settings:dateandtime", "日期和时间"),
        "language" => ("", "ms-settings:regionlanguage", "语言设置"),
        "privacy" => ("", "ms-settings:privacy", "隐私设置"),
        "personalize" => ("", "ms-settings:personalization", "个性化"),
        "themes" => ("", "ms-settings:themes", "主题"),
        "wallpaper" => ("", "ms-settings:personalization-background", "壁纸"),
        "lockscreen" => ("", "ms-settings:lockscreen", "锁屏界面"),
        "taskbar" => ("", "ms-settings:taskbar", "任务栏设置"),
        "startmenu" => ("", "ms-settings:personalization-start", "开始菜单设置"),
        "mouse" => ("", "ms-settings:mousetouchpad", "鼠标设置"),
        "keyboard" => ("", "ms-settings:typing", "键盘设置"),
        value
            if value.starts_with("ms-settings:")
                || value.starts_with("https://")
                || value.starts_with("http://") =>
        {
            ("", value, value)
        }
        _ => return None,
    };
    Some(value)
}
async fn window_tool(app: &AppHandle, tool: &str, args: &Value) -> Result<Value> {
    let open_windows =
        crate::services::system::handle(app, "system:open-windows:with-icons:get", &[]).await?;
    let values=open_windows.as_array().cloned().unwrap_or_default().iter().map(|window|json!({"pid":window["processId"],"name":window["processName"],"title":window["title"],"handle":window["id"].as_str().and_then(|value|value.parse::<u64>().ok()).unwrap_or(0),"path":window["processPath"]})).collect::<Vec<_>>();
    if tool == "win.list" {
        let filter = string(args, "filter").to_lowercase();
        let values = values
            .into_iter()
            .filter(|window| {
                filter.is_empty()
                    || window["name"]
                        .as_str()
                        .unwrap_or("")
                        .to_lowercase()
                        .contains(&filter)
                    || window["title"]
                        .as_str()
                        .unwrap_or("")
                        .to_lowercase()
                        .contains(&filter)
            })
            .collect::<Vec<_>>();
        return Ok(json!({"count":values.len(),"windows":values}));
    }
    let handle = args["handle"].as_u64();
    let pid = args["pid"].as_u64();
    let name = string(args, "name").to_lowercase();
    if handle.is_none() && pid.is_none() && name.is_empty() {
        return Err("Window control requires pid, name or handle".into());
    }
    let window = values
        .iter()
        .find(|window| {
            if let Some(handle) = handle {
                window["handle"] == handle
            } else if let Some(pid) = pid {
                window["pid"] == pid
            } else {
                window["name"]
                    .as_str()
                    .unwrap_or("")
                    .to_lowercase()
                    .contains(&name)
                    || (tool != "win.close"
                        && window["title"]
                            .as_str()
                            .unwrap_or("")
                            .to_lowercase()
                            .contains(&name))
            }
        })
        .ok_or("No matching window")?;
    if tool == "win.close" {
        windows()?;
        let pid = window["pid"].as_u64().ok_or("Missing process id")?;
        command("taskkill.exe", &["/PID", &pid.to_string(), "/F"], false).await?;
        return Ok(json!({"closed":{"pid":pid,"name":window["name"],"title":window["title"]}}));
    }
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            IsWindow, ShowWindow, SW_MAXIMIZE, SW_MINIMIZE, SW_RESTORE,
        };
        let handle = window["handle"].as_u64().ok_or("Missing window handle")? as isize
            as *mut std::ffi::c_void;
        let flag = match tool {
            "win.minimize" => SW_MINIMIZE,
            "win.maximize" => SW_MAXIMIZE,
            _ => SW_RESTORE,
        };
        unsafe {
            if IsWindow(handle) == 0 {
                return Err("Window no longer exists".into());
            }
            ShowWindow(handle, flag);
        }
        Ok(
            json!({"pid":window["pid"],"name":window["name"],"title":window["title"],"handle":window["handle"],"action":match tool{"win.minimize"=>"最小化","win.maximize"=>"最大化",_=>"还原"}}),
        )
    }
    #[cfg(not(windows))]
    {
        Err("Window control requires Windows".into())
    }
}
fn registry_path(path: &str) -> Result<String> {
    for (short, long) in [
        ("HKCU", "HKEY_CURRENT_USER"),
        ("HKLM", "HKEY_LOCAL_MACHINE"),
        ("HKCR", "HKEY_CLASSES_ROOT"),
        ("HKU", "HKEY_USERS"),
        ("HKCC", "HKEY_CURRENT_CONFIG"),
    ] {
        if path.to_uppercase().starts_with(&format!("{short}:\\")) {
            return Ok(format!("Registry::{long}\\{}", &path[short.len() + 2..]));
        }
        if path
            .to_uppercase()
            .starts_with(&format!("REGISTRY::{long}\\"))
        {
            return Ok(path.to_owned());
        }
    }
    Err("Registry tools require a registry hive path".into())
}
async fn registry(tool: &str, args: &Value) -> Result<Value> {
    let original = required(args, "path")?;
    let path = registry_path(original)?;
    let mut payload = args.clone();
    payload["path"] = json!(path);
    match tool {
        "registry.read" => {
            let value=powershell("if($a.name){Get-ItemPropertyValue -LiteralPath ([string]$a.path) -Name ([string]$a.name)}else{Get-ItemProperty -LiteralPath ([string]$a.path) | Select-Object * -ExcludeProperty PS*}",&payload).await?;
            Ok(json!({"path":original,"name":optional(string(args,"name")),"value":value}))
        }
        "registry.write" => {
            let name = required(args, "name")?;
            let kind = if string(args, "type").is_empty() {
                "String"
            } else {
                string(args, "type")
            };
            if !matches!(
                kind,
                "String" | "ExpandString" | "Binary" | "DWord" | "MultiString" | "QWord" | "None"
            ) {
                return Err("Invalid registry property type".into());
            }
            payload["type"] = json!(kind);
            powershell("New-ItemProperty -LiteralPath ([string]$a.path) -Name ([string]$a.name) -Value $a.value -PropertyType ([string]$a.type) -Force | Out-Null; $true",&payload).await?;
            Ok(json!({"path":original,"name":name,"written":true}))
        }
        _ => {
            powershell("if($a.name){Remove-ItemProperty -LiteralPath ([string]$a.path) -Name ([string]$a.name) -Force}else{Remove-Item -LiteralPath ([string]$a.path) -Recurse -Force};$true",&payload).await?;
            Ok(json!({"path":original,"name":optional(string(args,"name")),"deleted":true}))
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn registry_tools_accept_only_hives_not_filesystem_paths() {
        assert_eq!(
            registry_path("HKCU:\\Software\\eIsland").unwrap(),
            "Registry::HKEY_CURRENT_USER\\Software\\eIsland"
        );
        assert!(registry_path("C:\\Users").is_err());
        assert!(registry_path("HKCU:../../Users").is_err());
    }
    #[test]
    fn dispatch_and_builtin_targets_reject_unknown_actions() {
        assert!(!recognized("sys.execute-arbitrary"));
        assert!(builtin_target("taskmgr").is_some());
        assert!(builtin_target("cmd.exe /c anything").is_none());
    }
    #[cfg(windows)]
    #[test]
    fn powershell_transport_keeps_arguments_as_json_data() {
        tauri::async_runtime::block_on(async {
            let value = "' ; throw 'injection' ; #";
            assert_eq!(
                powershell("@{value=$a.value}", &json!({"value":value}))
                    .await
                    .unwrap()["value"],
                value
            );
        });
    }
}
