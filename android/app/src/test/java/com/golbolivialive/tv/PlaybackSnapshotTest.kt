package com.golbolivialive.tv

import org.junit.Assert.*
import org.junit.Test

class PlaybackSnapshotTest {
    @Test fun recreatingScreenRestoresSelectedMatchSourceAndPauseState() {
        val item = WatchItem("match:123", "Bolívar vs Oriente", "Liga", true,
            listOf(WatchSource("HLS", "https://example.com/live.m3u8"), WatchSource("Kick", "https://player.kick.com/golbolivia", true)),
            "/live/123", home = TeamInfo("bolivar", "Bolívar", "https://example.com/crest.png", "#0284c7"),
            away = TeamInfo("oriente", "Oriente"), status = "EN VIVO · 2T", category = "live", score = "2 – 1")
        val saved = PlaybackSnapshot(item, 1, false)
        assertEquals(saved, PlaybackSnapshot.decode(saved.encode()))
    }

    @Test fun channelRecoveryIsIndependentOfTheMatchCatalog() {
        val channel = WatchItem("channel:abc", "Canal", "Bolivia", false,
            listOf(WatchSource("Canal", "https://example.com/embed", true)), "/tv/abc", true)
        val recovered = PlaybackSnapshot.decode(PlaybackSnapshot(channel, 50, true).encode())!!
        assertTrue(recovered.item.channel)
        assertEquals(0, recovered.sourceIndex)
        assertTrue(recovered.playWhenReady)
    }

    @Test fun brokenSavedStateDoesNotCrashOrLoadLocalContent() {
        assertNull(PlaybackSnapshot.decode(null))
        assertNull(PlaybackSnapshot.decode("not-json"))
        assertNull(PlaybackSnapshot.decode("""{"id":"x","title":"x","sources":[{"provider":"Web","url":"file:///sdcard/x","embedded":true}]}"""))
    }
}
