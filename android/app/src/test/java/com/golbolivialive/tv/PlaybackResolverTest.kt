package com.golbolivialive.tv

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class PlaybackResolverTest {
    private val original = WatchItem("match:a/b", "Partido", "Liga", true,
        listOf(WatchSource("HLS", "https://old.test/live.m3u8", id = "main")), "/live/a%2Fb", score = "2 – 1")

    @Test fun refreshesOnlyPlaybackAndPreservesOfficialScore() {
        val result = PlaybackResolver.refresh(original) { path ->
            assertEquals("/api/live-events/a%2Fb", path)
            JSONObject("""{"success":true,"event":{"id":"a/b","sources":[{"id":"main","type":"hls","name":"OBS","url":"https://new.test/live.m3u8"}],"homeScore":0,"awayScore":0,"autoFailoverEnabled":false}}""")
        }
        assertTrue(result.confirmed)
        assertEquals("https://new.test/live.m3u8", result.item.sources.single().url)
        assertEquals("2 – 1", result.item.score)
        assertEquals(original.title, result.item.title)
        assertFalse(result.item.autoFailover)
    }
    @Test fun explicitEmptySourcesCannotReviveAnOldSignal() {
        val result = PlaybackResolver.fromResponse(original, JSONObject("""{"event":{"id":"a/b","sources":[],"customVideoUrl":"https://obsolete.test/live.m3u8"}}"""))
        assertTrue(result.confirmed)
        assertTrue(result.item.sources.isEmpty())
    }
    @Test fun staleServerResponseCannotReplaceCurrentSources() {
        val result = PlaybackResolver.fromResponse(original, JSONObject("""{"stale":true,"event":{"id":"a/b","sources":[]}}"""))
        assertEquals(original, result.item)
        assertFalse(result.confirmed)
        assertTrue(result.warning.isNotBlank())
    }
    @Test fun offlineAndMismatchedResponsesRetainSnapshotWithWarning() {
        for (failure in listOf<(String) -> JSONObject>(
            { throw java.io.IOException("offline") },
            { JSONObject("""{"event":{"id":"other","sources":[]}}""") },
            { JSONObject("""{"success":false}""") }
        )) {
            val result = PlaybackResolver.refresh(original, failure)
            assertEquals(original, result.item)
            assertFalse(result.confirmed)
            assertTrue(result.warning.isNotBlank())
        }
    }
    @Test fun deletedEventDoesNotPlayItsCachedUrl() {
        val result = PlaybackResolver.refresh(original) { throw CatalogHttpException(404) }
        assertTrue(result.confirmed)
        assertTrue(result.item.sources.isEmpty())
    }
    @Test fun supportsOldServersAndConfirmedChannelDeletion() {
        val channel = original.copy(id = "channel:c", channel = true)
        val unsupported = PlaybackResolver.refresh(channel) { throw CatalogHttpException(404) }
        assertEquals(channel, unsupported.item)
        assertFalse(unsupported.confirmed)
        val deleted = PlaybackResolver.refresh(channel) { throw CatalogHttpException(404, "CHANNEL_NOT_FOUND") }
        assertTrue(deleted.confirmed)
        assertTrue(deleted.item.sources.isEmpty())
    }
    @Test fun refreshesAChannelWithoutTransferringTheFullCatalog() {
        val channel = original.copy(id = "channel:c", channel = true)
        val result = PlaybackResolver.refresh(channel) { path ->
            assertEquals("/api/iptv/sports/c", path)
            JSONObject("""{"success":true,"channel":{"id":"c","name":"Canal","streamUrl":"https://new.test/live.mpd"}}""")
        }
        assertTrue(result.confirmed)
        assertEquals("https://new.test/live.mpd", result.item.sources.single().url)
    }
}
