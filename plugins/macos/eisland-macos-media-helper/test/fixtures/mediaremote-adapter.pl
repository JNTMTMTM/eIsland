#!/usr/bin/perl
# eIsland - https://github.com/JNTMTMTM/eIsland
# Copyright (C) 2026 JNTMTMTM / pyisland.com
# SPDX-License-Identifier: GPL-3.0-or-later
# @file mediaremote-adapter.pl
# @description 无真实媒体副作用的原生 IPC 测试桥接。
# @author 鸡哥
use strict;
use warnings;
use JSON::PP;
use Time::HiRes qw(sleep);
use Fcntl qw(:flock);

my ($framework, $command, @arguments) = @ARGV;
$| = 1;
my $json = JSON::PP->new->canonical;

# @returns 测试动态状态，避免监听测试依赖播放器。
sub state {
  open my $file, '<', "$framework/state.json" or die $!;
  local $/;
  return $json->decode(<$file>);
}

open my $log, '>>', "$framework/commands.log" or die $!;
flock $log, LOCK_EX;
print $log $json->encode({ command => $command, arguments => \@arguments, pid => $$ }), "\n";
close $log;
my $initial = state();
$SIG{TERM} = sub { exit 0; } unless $initial->{ignoreTerm};
if ($initial->{ignoreTerm}) { $SIG{TERM} = 'IGNORE'; }

if ($command eq 'stream') {
  my $previous = '';
  while (1) {
    my $current = state();
    if ($current->{exitStream}) { print STDERR "fixture stream failure\n"; exit 2; }
    my $line = $current->{invalidStream} ? '{broken' : $json->encode({
      type => 'data', diff => JSON::PP::false, payload => $current->{payload} // {},
    });
    if ($line ne $previous) { print "$line\n"; $previous = $line; }
    sleep 0.03;
  }
}
if ($command eq 'get') {
  sleep($initial->{delayGet} // 0);
  if ($initial->{queryError}) { print STDERR "fixture query failure\n"; exit 2; }
  if ($initial->{getRaw}) { print $initial->{getRaw}; exit 0; }
  if ($initial->{oversized}) { print 'x' x (13 * 1024 * 1024); exit 0; }
  print $json->encode($initial->{payload}), "\n";
  exit 0;
}
sleep($initial->{delayCommand} // 0);
if ($initial->{commandError}) { print STDERR "fixture command rejected\n"; exit 3; }
exit 0;
