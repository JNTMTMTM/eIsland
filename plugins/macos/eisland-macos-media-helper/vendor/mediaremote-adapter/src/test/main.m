// Copyright (c) 2025 Alexander5015
// This file is licensed under the BSD 3-Clause License.

#import <Foundation/Foundation.h>

#import "NowPlayingTest.h"

static const NSTimeInterval kRunLoopInterval = 0.1;
static const size_t kInputBufferSize = 256;
int main(int argc, const char *argv[]) {
    @autoreleasepool {
        dup2(STDOUT_FILENO, STDERR_FILENO);

        NowPlayingPublishTest *test = [[NowPlayingPublishTest alloc] init];
        puts("setup_done");
        fflush(stdout);

        BOOL shouldExit = NO;
        while (!shouldExit) {
            NSDate *waitUntil =
                [NSDate dateWithTimeIntervalSinceNow:kRunLoopInterval];
            [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode
                                     beforeDate:waitUntil];

            fd_set fds;
            struct timeval tv = {0, 0};
            FD_ZERO(&fds);
            FD_SET(STDIN_FILENO, &fds);
            int ret = select(STDIN_FILENO + 1, &fds, NULL, NULL, &tv);
            if (ret > 0 && FD_ISSET(STDIN_FILENO, &fds)) {
                char buf[kInputBufferSize];
                if (fgets(buf, sizeof(buf), stdin)) {
                    NSString *command =
                        [[NSString alloc] initWithUTF8String:buf];
                    command = [command
                        stringByTrimmingCharactersInSet:
                            [NSCharacterSet whitespaceAndNewlineCharacterSet]];
                    if ([command isEqualToString:@"cleanup"]) {
                        printf("cleanup_done\n");
                        fflush(stdout);
                        shouldExit = YES;
                        break;
                    } else {

                        puts("unknown_command");
                        fflush(stdout);
                    }
                }
            }
        }
    }
    return 0;
}
