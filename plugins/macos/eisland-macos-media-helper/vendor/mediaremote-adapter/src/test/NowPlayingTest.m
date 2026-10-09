// Copyright (c) 2025 Alexander5015
// This file is licensed under the BSD 3-Clause License.

#include <MediaPlayer/MediaPlayer.h>

#import "NowPlayingTest.h"

NS_ASSUME_NONNULL_BEGIN

// Constants
static const NSTimeInterval kDefaultTrackDuration = 10.0 * 60.0; // 10 minutes
static const float kPlayingRate = 1.0f;
static const float kPausedRate = 0.0f;

@implementation NowPlayingInfoDelegate {
    MPNowPlayingInfoCenter *_center;
}

- (instancetype)init {
    if (self = [super init]) {
        _center = [MPNowPlayingInfoCenter defaultCenter];
    }
    return self;
}

- (MPNowPlayingInfoCenter *)center {
    return _center;
}

- (void)updateMetadataWithTitle:(NSString *)title
                         artist:(NSString *)artist
                       duration:(NSTimeInterval)duration {
    NSMutableDictionary *nowPlayingInfo = [@{
        MPMediaItemPropertyTitle : title ?: @"Unknown Title",
        MPMediaItemPropertyAlbumTitle : @"Unknown Album",
        MPMediaItemPropertyArtist : artist ?: @"Unknown Artist",
        MPMediaItemPropertyPlaybackDuration : @(duration),
        MPNowPlayingInfoPropertyElapsedPlaybackTime : @0,
        MPNowPlayingInfoPropertyCurrentPlaybackDate : [NSDate date],
        MPNowPlayingInfoPropertyPlaybackRate : @(kPlayingRate),
        MPNowPlayingInfoPropertyMediaType : @(MPNowPlayingInfoMediaTypeAudio),
        MPNowPlayingInfoPropertyServiceIdentifier :
            @"com.vandenbe.MediaRemoteAdapter.TestClient",
    } mutableCopy];

#if defined(__MAC_15_0) && __MAC_OS_X_VERSION_MAX_ALLOWED >= __MAC_15_0
    if (@available(macOS 15, *)) {
        nowPlayingInfo[MPNowPlayingInfoPropertyExcludeFromSuggestions] = @YES;
    }
#endif

    self.center.playbackState = MPNowPlayingPlaybackStatePlaying;
    self.center.nowPlayingInfo = [nowPlayingInfo copy];
}

- (void)setPlaybackRate:(float)rate elapsedTime:(NSTimeInterval)time {
    NSMutableDictionary *currentInfo = [self.center.nowPlayingInfo mutableCopy];
    if (!currentInfo) {
        return;
    }

    currentInfo[MPNowPlayingInfoPropertyPlaybackRate] = @(rate);
    currentInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = @(time);
    self.center.nowPlayingInfo = [currentInfo copy];
}

@end

@implementation RemoteCommandCenterDelegate

- (instancetype)initWithListener:
    (id<RemoteCommandCenterDelegateListener>)listener {
    if (self = [super init]) {
        _listener = listener;
        [self setupRemoteCommandHandlers];
    }
    return self;
}

- (void)setupRemoteCommandHandlers {
    MPRemoteCommandCenter *commandCenter =
        [MPRemoteCommandCenter sharedCommandCenter];

    [commandCenter.playCommand addTarget:self
                                  action:@selector(handlePlayCommand:)];
    [commandCenter.pauseCommand addTarget:self
                                   action:@selector(handlePauseCommand:)];
}

- (MPRemoteCommandHandlerStatus)handlePlayCommand:
    (MPRemoteCommandEvent *)event {
    [self.listener didReceivePlayCommand];
    return MPRemoteCommandHandlerStatusSuccess;
}

- (MPRemoteCommandHandlerStatus)handlePauseCommand:
    (MPRemoteCommandEvent *)event {
    [self.listener didReceivePauseCommand];
    return MPRemoteCommandHandlerStatusSuccess;
}

@end

@interface NowPlayingPublishTest ()
@property(nonatomic, strong, readwrite)
    NowPlayingInfoDelegate *nowPlayingDelegate;
@property(nonatomic, strong, readwrite)
    RemoteCommandCenterDelegate *commandDelegate;
@property(nonatomic, assign, readwrite) BOOL isPlaying;
@property(nonatomic, assign, readwrite) NSTimeInterval elapsedTime;
@property(nonatomic, strong, nullable, readwrite) NSDate *playbackStartDate;
@property(nonatomic, assign, readwrite) NSTimeInterval totalDuration;
@end

@implementation NowPlayingPublishTest

- (instancetype)init {
    if (self = [super init]) {
        [self setupDelegates];
        [self initializePlaybackState];
        [self setupInitialTrack];
    }
    return self;
}

- (void)setupDelegates {
    self.nowPlayingDelegate = [[NowPlayingInfoDelegate alloc] init];
    self.commandDelegate =
        [[RemoteCommandCenterDelegate alloc] initWithListener:self];
}

- (void)initializePlaybackState {
    self.totalDuration = kDefaultTrackDuration;
    self.elapsedTime = 0.0;
    self.playbackStartDate = [NSDate date];
    self.isPlaying = YES;
}

- (void)setupInitialTrack {
    [self.nowPlayingDelegate updateMetadataWithTitle:@"Is It Broken Yet?"
                                              artist:@"Alexander5015, ungive"
                                            duration:self.totalDuration];
    [self updateNowPlayingInfo];
}

- (void)didReceivePlayCommand {
    if (self.isPlaying) {
        return; // Already playing
    }

    [self startPlayback];
}

- (void)didReceivePauseCommand {
    if (!self.isPlaying) {
        return; // Already paused
    }

    [self pausePlayback];
}

- (void)startPlayback {
    self.isPlaying = YES;
    self.playbackStartDate = [NSDate date];
    [self updateNowPlayingInfo];
}

- (void)pausePlayback {
    self.isPlaying = NO;
    [self updateElapsedTimeFromPlaybackStart];
    self.playbackStartDate = nil;
    [self updateNowPlayingInfo];
}

- (void)updateElapsedTimeFromPlaybackStart {
    if (!self.playbackStartDate) {
        return;
    }

    NSTimeInterval playedInterval =
        [[NSDate date] timeIntervalSinceDate:self.playbackStartDate];
    self.elapsedTime += playedInterval;

    // Ensure elapsed time doesn't exceed total duration
    if (self.elapsedTime > self.totalDuration) {
        self.elapsedTime = self.totalDuration;
    }
}

- (void)updateNowPlayingInfo {
    NSTimeInterval currentElapsedTime = [self calculateCurrentElapsedTime];
    float playbackRate = [self calculatePlaybackRate:currentElapsedTime];

    [self.nowPlayingDelegate setPlaybackRate:playbackRate
                                 elapsedTime:currentElapsedTime];
}

- (NSTimeInterval)calculateCurrentElapsedTime {
    NSTimeInterval currentElapsed = self.elapsedTime;

    if (self.isPlaying && self.playbackStartDate) {
        NSTimeInterval intervalSinceStart =
            [[NSDate date] timeIntervalSinceDate:self.playbackStartDate];
        currentElapsed += intervalSinceStart;

        // Cap at total duration
        if (currentElapsed > self.totalDuration) {
            currentElapsed = self.totalDuration;
        }
    }

    return currentElapsed;
}

- (float)calculatePlaybackRate:(NSTimeInterval)currentElapsedTime {
    if (!self.isPlaying) {
        return kPausedRate;
    }

    // Check if track has ended
    if (currentElapsedTime >= self.totalDuration) {
        self.isPlaying = NO; // Auto-pause when track ends
        return kPausedRate;
    }

    return kPlayingRate;
}

@end

NS_ASSUME_NONNULL_END
