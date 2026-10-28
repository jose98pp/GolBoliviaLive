package com.golbolivialive.tv

import org.junit.Assert.*
import org.junit.Test

class BroadcastStartupTest {
    @Test fun onlyOwnBroadcastMayWaitForInitialManifest404() {
        assertTrue(BroadcastStartup.canRetry(true, 404, false, 0, 1000))
        assertFalse(BroadcastStartup.canRetry(false, 404, false, 0, 1000))
        assertFalse(BroadcastStartup.canRetry(true, 403, false, 0, 1000))
        assertFalse(BroadcastStartup.canRetry(true, 401, false, 0, 1000))
    }
    @Test fun missingSegmentsAfterPlaybackNeverRestartBroadcastWaiting() {
        assertFalse(BroadcastStartup.canRetry(true, 404, true, 0, 1000))
    }
    @Test fun retryBudgetAndDeadlineAreFinite() {
        assertFalse(BroadcastStartup.canRetry(true, 404, false, 3, 1000))
        assertFalse(BroadcastStartup.canRetry(true, 404, false, 0, 30000))
    }
}
