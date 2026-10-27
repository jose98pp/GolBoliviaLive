package com.golbolivialive.tv

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class PlaybackPolicyTest {
    @Test fun choosesDashHlsAndProgressiveFormatsWithSignedQueries() {
        assertEquals("application/dash+xml", PlaybackPolicy.mimeType(WatchSource("Canal", "https://video.test/live.MPD?token=test")))
        assertEquals("application/x-mpegURL", PlaybackPolicy.mimeType(WatchSource("HLS", "https://video.test/play?id=one")))
        assertEquals("video/mp4", PlaybackPolicy.mimeType(WatchSource("HLS", "https://video.test/movie.mp4?x=1")))
        assertNull(PlaybackPolicy.mimeType(WatchSource("YouTube", "https://www.youtube.com/embed/abcdefghijk", true)))
    }
    @Test fun accessAndDrmErrorsNeverSilentlyChangeTheChannel() {
        assertFalse(PlaybackPolicy.canFailover(true, 401))
        assertFalse(PlaybackPolicy.canFailover(true, 403))
        assertFalse(PlaybackPolicy.canFailover(true, null, restricted = true))
        assertFalse(PlaybackPolicy.canFailover(false, 503))
        assertTrue(PlaybackPolicy.canFailover(true, 503))
        assertTrue(PlaybackPolicy.canFailover(true, null))
    }
    @Test fun stableSourceIdSurvivesReorderingAndUrlRefresh() {
        val previous = WatchSource("HLS", "https://old.test/live.m3u8", id = "main")
        val sources = listOf(WatchSource("HLS", "https://backup.test/live.m3u8", id = "backup"), previous.copy(url = "https://new.test/live.m3u8"))
        assertEquals(1, PlaybackPolicy.sourceIndex(sources, previous))
        assertEquals(0, PlaybackPolicy.sourceIndex(sources.take(1), previous))
    }
    @Test fun acceptsDashInThePublicEventContractAndRecovery() {
        val item = Catalog.matches(JSONObject("""{"events":[{"id":"a","sources":[{"id":"dash","type":"dash","url":"https://video.test/manifest","name":"DASH"}]}]}""")).single()
        assertEquals("application/dash+xml", PlaybackPolicy.mimeType(item.sources.single()))
        assertEquals(item, PlaybackSnapshot.decode(PlaybackSnapshot(item, 0, true).encode())?.item)
    }
    @Test fun legacySourceWithoutIdIsMatchedByUrl() {
        val a = WatchSource("HLS", "https://video.test/a.m3u8")
        assertEquals(1, PlaybackPolicy.sourceIndex(listOf(a.copy(url = "https://video.test/b.m3u8"), a), a))
        assertEquals(0, PlaybackPolicy.sourceIndex(emptyList(), null))
    }
}
