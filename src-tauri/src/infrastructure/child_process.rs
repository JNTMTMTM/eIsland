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

use crate::shared::Result;

/// Bind managed native helper children to the application lifetime.
/// User-launched applications and shell tools remain outside this job.
pub fn contain(pid: u32) -> Result<()> {
    #[cfg(windows)]
    {
        use std::sync::OnceLock;
        use windows_sys::Win32::{
            Foundation::CloseHandle,
            System::{
                JobObjects::*,
                Threading::{OpenProcess, PROCESS_SET_QUOTA, PROCESS_TERMINATE},
            },
        };
        static JOB: OnceLock<Result<usize>> = OnceLock::new();
        let job = JOB
            .get_or_init(|| {
                let handle = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
                if handle.is_null() {
                    return Err(std::io::Error::last_os_error().to_string());
                }
                let mut limits =
                    unsafe { std::mem::zeroed::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() };
                limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
                if unsafe {
                    SetInformationJobObject(
                        handle,
                        JobObjectExtendedLimitInformation,
                        (&limits as *const JOBOBJECT_EXTENDED_LIMIT_INFORMATION).cast(),
                        std::mem::size_of_val(&limits) as u32,
                    )
                } == 0
                {
                    let error = std::io::Error::last_os_error().to_string();
                    unsafe {
                        CloseHandle(handle);
                    }
                    return Err(error);
                }
                // Retain a non-inheritable handle until process exit, including forced exits.
                Ok(handle as usize)
            })
            .as_ref()
            .map_err(Clone::clone)?;
        let process = unsafe { OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, pid) };
        if process.is_null() {
            return Err(std::io::Error::last_os_error().to_string());
        }
        let assigned = unsafe { AssignProcessToJobObject(*job as _, process) };
        let error = std::io::Error::last_os_error();
        unsafe {
            CloseHandle(process);
        }
        if assigned == 0 {
            return Err(error.to_string());
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = pid;
        Ok(())
    }
}

/// Bounded one-shot execution policy. App-owned helpers opt into Job Object containment;
/// explicitly launched external applications never do.
#[derive(Clone, Copy, Debug)]
pub struct Options {
    pub timeout: std::time::Duration,
    pub stdout_limit: usize,
    pub stderr_limit: usize,
    pub check_exit: bool,
    pub managed: bool,
}
impl Default for Options {
    fn default() -> Self {
        Self {
            timeout: std::time::Duration::from_secs(35),
            stdout_limit: 1024 * 1024,
            stderr_limit: 65536,
            check_exit: true,
            managed: false,
        }
    }
}
#[derive(Debug)]
pub struct Output {
    pub stdout: Vec<u8>,
    pub stderr: Vec<u8>,
    pub status: std::process::ExitStatus,
}
impl Output {
    pub fn stdout_text(&self) -> String {
        decode(&self.stdout)
    }
    pub fn stderr_text(&self) -> String {
        decode(&self.stderr)
    }
}
/// Decode explicit UTF BOMs and common UTF-16LE helper output; ordinary helpers use UTF-8.
pub fn decode(bytes: &[u8]) -> String {
    let (bytes, little) = if bytes.starts_with(&[255, 254]) {
        (&bytes[2..], true)
    } else if bytes.starts_with(&[254, 255]) {
        (&bytes[2..], false)
    } else if bytes.len() >= 4
        && bytes.len().is_multiple_of(2)
        && bytes
            .as_chunks::<2>()
            .0
            .iter()
            .take(16)
            .all(|pair| pair[1] == 0)
    {
        (bytes, true)
    } else {
        return String::from_utf8_lossy(bytes.strip_prefix(&[239, 187, 191]).unwrap_or(bytes))
            .into_owned();
    };
    String::from_utf16_lossy(
        &bytes
            .as_chunks::<2>()
            .0
            .iter()
            .map(|pair| {
                if little {
                    u16::from_le_bytes([pair[0], pair[1]])
                } else {
                    u16::from_be_bytes([pair[0], pair[1]])
                }
            })
            .collect::<Vec<_>>(),
    )
}
/// Construct a hidden owned child. Callers still choose stdio and containment explicitly.
pub fn command(program: impl AsRef<std::ffi::OsStr>) -> tokio::process::Command {
    let mut command = tokio::process::Command::new(program);
    command.kill_on_drop(true);
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    command
}
/// Construct an external launcher without adding it to the app-owned Job Object.
pub fn external_command(program: impl AsRef<std::ffi::OsStr>) -> std::process::Command {
    let mut command = std::process::Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command
}
/// Spawn a long-lived helper using the same ownership boundary as bounded execution.
pub fn spawn(
    command: &mut tokio::process::Command,
    managed: bool,
) -> Result<tokio::process::Child> {
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    if managed {
        if let Some(pid) = child.id() {
            if let Err(error) = contain(pid) {
                let _ = child.start_kill();
                return Err(error);
            }
        }
    }
    Ok(child)
}
async fn read_limit(reader: impl tokio::io::AsyncRead + Unpin, limit: usize) -> Result<Vec<u8>> {
    use tokio::io::AsyncReadExt;
    let mut bytes = Vec::new();
    reader
        .take(limit as u64 + 1)
        .read_to_end(&mut bytes)
        .await
        .map_err(|e| e.to_string())?;
    if bytes.len() > limit {
        return Err("Process output limit exceeded".into());
    }
    Ok(bytes)
}
/// Read one bounded line from a persistent helper without allocating an unbounded line.
pub async fn read_line(
    reader: &mut (impl tokio::io::AsyncBufRead + Unpin),
    limit: usize,
) -> Result<Option<String>> {
    use tokio::io::{AsyncBufReadExt, AsyncReadExt};
    let mut bytes = Vec::new();
    let count = (&mut *reader)
        .take(limit as u64 + 1)
        .read_until(b'\n', &mut bytes)
        .await
        .map_err(|e| e.to_string())?;
    if count > limit {
        return Err("Process line output limit exceeded".into());
    }
    Ok(if count == 0 {
        None
    } else {
        Some(decode(&bytes))
    })
}
/// Run a finite command with separate bounded streams, timeout and cancellation. Dropping
/// the future also kills the child; process errors always reap it before returning.
type StderrListener = Box<dyn FnMut(&str) + Send>;
async fn supervise(
    mut command: tokio::process::Command,
    options: Options,
    mut cancel: Option<tokio::sync::watch::Receiver<bool>>,
    on_stderr: Option<StderrListener>,
) -> Result<Output> {
    command
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    let mut child = spawn(&mut command, options.managed)?;
    let stdout = child.stdout.take().ok_or("Process stdout unavailable")?;
    let stderr = child.stderr.take().ok_or("Process stderr unavailable")?;
    let operation = async {
        let (stdout, stderr) = tokio::try_join!(
            read_limit(stdout, options.stdout_limit),
            read_stderr(stderr, options.stderr_limit, on_stderr)
        )?;
        let status = child.wait().await.map_err(|e| e.to_string())?;
        let output = Output {
            stdout,
            stderr,
            status,
        };
        if options.check_exit && !status.success() {
            return Err(format!(
                "Process exited with {status}: {}",
                output.stderr_text().trim()
            ));
        }
        Ok(output)
    };
    let canceled = async {
        match cancel.as_mut() {
            Some(receiver) => {
                if *receiver.borrow() {
                    return;
                }
                loop {
                    if receiver.changed().await.is_err() || *receiver.borrow() {
                        return;
                    }
                }
            }
            None => std::future::pending::<()>().await,
        }
    };
    let result = tokio::select! { result=tokio::time::timeout(options.timeout,operation)=>result.map_err(|_|"Process timed out".to_owned()).and_then(|value|value),_ = canceled=>Err("Process cancelled".into()) };
    if result.is_err() {
        let _ = child.kill().await;
        let _ = child.wait().await;
    }
    result
}
async fn read_stderr(
    reader: impl tokio::io::AsyncRead + Unpin,
    limit: usize,
    mut listener: Option<StderrListener>,
) -> Result<Vec<u8>> {
    let Some(listener) = listener.as_mut() else {
        return read_limit(reader, limit).await;
    };
    use tokio::io::AsyncReadExt;
    let mut reader = reader;
    let mut bytes = Vec::new();
    let mut line = Vec::new();
    let mut buffer = [0u8; 8192];
    loop {
        let count = reader.read(&mut buffer).await.map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        let retained = count.min(limit.saturating_sub(bytes.len()));
        bytes.extend_from_slice(&buffer[..retained]);
        for byte in &buffer[..count] {
            if matches!(byte, b'\r' | b'\n') {
                if !line.is_empty() {
                    listener(&decode(&line));
                    line.clear();
                }
            } else {
                if line.len() >= 65536 {
                    return Err("Process line output limit exceeded".into());
                }
                line.push(*byte);
            }
        }
    }
    if !line.is_empty() {
        listener(&decode(&line));
    }
    Ok(bytes)
}
/// Run with a cancellation token through the shared process supervisor.
pub async fn run_cancelled(
    command: tokio::process::Command,
    options: Options,
    cancel: Option<tokio::sync::watch::Receiver<bool>>,
) -> Result<Output> {
    supervise(command, options, cancel, None).await
}
/// Stream bounded diagnostic lines through the shared supervisor. Retain at most the
/// configured stderr prefix while continuing to drain progress, including CR-only output.
pub async fn run_with_stderr_lines<F>(
    command: tokio::process::Command,
    options: Options,
    listener: F,
) -> Result<Output>
where
    F: FnMut(&str) + Send + 'static,
{
    supervise(command, options, None, Some(Box::new(listener))).await
}
/// Execute without a cancellation token; callers may cancel by dropping the returned future.
pub async fn run(command: tokio::process::Command, options: Options) -> Result<Output> {
    run_cancelled(command, options, None).await
}
/// Encode trusted PowerShell source for transport; user values belong in structured data.
pub fn powershell_command(script: &str) -> tokio::process::Command {
    use base64::Engine;
    let source = format!("[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);{script}");
    let encoded = base64::engine::general_purpose::STANDARD.encode(
        source
            .encode_utf16()
            .flat_map(u16::to_le_bytes)
            .collect::<Vec<_>>(),
    );
    let mut result = command("powershell.exe");
    result.args([
        "-NoProfile",
        "-NonInteractive",
        "-WindowStyle",
        "Hidden",
        "-EncodedCommand",
        &encoded,
    ]);
    result
}
/// Invoke a fixed PowerShell operation with a JSON payload, never interpolated user source.
pub async fn powershell_json(
    script: &str,
    args: &serde_json::Value,
    options: Options,
) -> Result<serde_json::Value> {
    use base64::Engine;
    let payload = base64::engine::general_purpose::STANDARD
        .encode(serde_json::to_vec(args).map_err(|e| e.to_string())?);
    let source=format!("$ErrorActionPreference='Stop';$a=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{payload}'))|ConvertFrom-Json;$result=& {{ {script} }};ConvertTo-Json -InputObject $result -Depth 20 -Compress");
    let output = run(powershell_command(&source), options)
        .await?
        .stdout_text();
    if output.trim().is_empty() {
        Ok(serde_json::Value::Null)
    } else {
        serde_json::from_str(output.trim().trim_start_matches('\u{feff}'))
            .map_err(|_| "Invalid system tool JSON response".into())
    }
}
#[cfg(test)]
mod execution_tests {
    use super::*;
    #[test]
    fn helper_text_encodings() {
        assert_eq!(decode(b"plain UTF8"), "plain UTF8");
        assert_eq!(decode(&[239, 187, 191, 65]), "A");
        assert_eq!(decode(&[255, 254, 0x60, 0x4f, 0x7d, 0x59]), "你好");
        assert_eq!(decode(&[254, 255, 0x4f, 0x60]), "你");
        assert_eq!(decode(&[65, 0, 66, 0]), "AB");
    }
    #[test]
    fn diagnostic_capture_is_bounded_without_stopping_long_progress_streams() {
        tauri::async_runtime::block_on(async {
            let input = "进度\r\n".repeat(20000) + "完成";
            let lines = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
            let sink = lines.clone();
            let captured = read_stderr(
                input.as_bytes(),
                8,
                Some(Box::new(move |line| {
                    sink.lock().unwrap().push(line.to_owned())
                })),
            )
            .await
            .unwrap();
            assert_eq!(captured, input.as_bytes()[..8]);
            {
                let lines = lines.lock().unwrap();
                assert_eq!(lines.len(), 20001);
                assert!(lines[..20000].iter().all(|line| line == "进度"));
                assert_eq!(lines.last().unwrap(), "完成");
            }
            assert!(
                read_stderr(&vec![b'x'; 65537][..], 8, Some(Box::new(|_| {})))
                    .await
                    .is_err()
            );
        });
    }
    #[test]
    fn helper_lines_are_bounded_before_allocation_and_end_at_eof() {
        tauri::async_runtime::block_on(async {
            let mut reader = tokio::io::BufReader::new(&b"abc\nxyz"[..]);
            assert_eq!(
                read_line(&mut reader, 4).await.unwrap().as_deref(),
                Some("abc\n")
            );
            assert_eq!(
                read_line(&mut reader, 4).await.unwrap().as_deref(),
                Some("xyz")
            );
            assert!(read_line(&mut reader, 4).await.unwrap().is_none());
            let mut reader = tokio::io::BufReader::new(&b"oversize"[..]);
            assert!(read_line(&mut reader, 4).await.is_err());
        });
    }
    #[cfg(windows)]
    #[test]
    fn finite_execution_enforces_limits_exit_timeout_and_cancellation() {
        tauri::async_runtime::block_on(async {
            let lines = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
            let sink = lines.clone();
            let streamed = run_with_stderr_lines(
                powershell_command(
                    "[Console]::Error.WriteLine('first');[Console]::Error.WriteLine('second')",
                ),
                Options::default(),
                move |line| sink.lock().unwrap().push(line.to_owned()),
            )
            .await
            .unwrap();
            assert!(streamed.stderr_text().contains("first"));
            assert_eq!(*lines.lock().unwrap(), vec!["first", "second"]);

            let output = run(
                powershell_command("Write-Output 'hello'"),
                Options::default(),
            )
            .await
            .unwrap();
            assert_eq!(output.stdout_text().trim(), "hello");
            assert!(run(
                powershell_command("Write-Output ('x'*100)"),
                Options {
                    stdout_limit: 8,
                    ..Options::default()
                }
            )
            .await
            .unwrap_err()
            .contains("limit"));
            assert!(run(powershell_command("exit 7"), Options::default())
                .await
                .unwrap_err()
                .contains("exited"));
            assert!(run(
                powershell_command("Start-Sleep -Seconds 10"),
                Options {
                    timeout: std::time::Duration::from_millis(50),
                    ..Options::default()
                }
            )
            .await
            .unwrap_err()
            .contains("timed out"));
            let (_, token) = tokio::sync::watch::channel(true);
            assert!(run_cancelled(
                powershell_command("Start-Sleep -Seconds 10"),
                Options::default(),
                Some(token)
            )
            .await
            .unwrap_err()
            .contains("cancelled"));
            let payload = serde_json::json!({"value":"'; throw 'bad' ; #你好"});
            assert_eq!(
                powershell_json("@{value=$a.value}", &payload, Options::default())
                    .await
                    .unwrap()["value"],
                payload["value"]
            );
        });
    }
}
