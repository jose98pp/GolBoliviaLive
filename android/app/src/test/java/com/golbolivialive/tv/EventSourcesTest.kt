package com.golbolivialive.tv

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class EventSourcesTest {
    @Test fun usesNamedSourcesAndDefaultInsteadOfObsoleteLegacyStream() {
        val item = Catalog.matches(JSONObject("""{"events":[{"id":"a","customVideoUrl":"https://old.test/live.m3u8","sources":[{"id":"hls","name":"Mi OBS","type":"hls","url":"https://new.test/index.m3u8","waitForBroadcast":true},{"id":"web","name":"Canal A","type":"iframe","url":"https://player.test/live"}],"defaultSourceId":"web","autoFailoverEnabled":false}]}""")).single()
        assertEquals("Canal A", item.sources[0].label)
        assertTrue(item.sources[0].embedded)
        assertEquals("Mi OBS", item.sources[1].label)
        assertTrue(item.sources[1].waitForBroadcast)
        assertFalse(item.autoFailover)
        assertFalse(item.sources.any { "old.test" in it.url })
    }
    @Test fun emptyOrInvalidExplicitSourcesNeverRestoreAnOldRemovedStream() {
        for (sources in listOf("[]", """[{"id":"bad","type":"hls","url":"http://unsafe.test/live.m3u8"}]""")) {
            val item = Catalog.matches(JSONObject("""{"events":[{"id":"a","customVideoUrl":"https://old.test/live.m3u8","sources":$sources}]}""")).single()
            assertTrue(item.sources.isEmpty())
        }
    }
    @Test fun officialVideoSourcesAreNormalizedInsideTheApplication() {
        val item = Catalog.matches(JSONObject("""{"events":[{"id":"a","sources":[{"id":"yt","name":"YouTube A","type":"youtube","url":"https://www.youtube.com/watch?v=abcdefghijk"},{"id":"kick","name":"Kick B","type":"kick","url":"https://kick.com/golbolivia"}]}]}""")).single()
        assertEquals("https://www.youtube.com/embed/abcdefghijk", item.sources[0].url)
        assertEquals("https://player.kick.com/golbolivia", item.sources[1].url)
        assertTrue(item.sources.all { it.embedded })
    }
    @Test fun selectionLabelsAndBroadcastPolicySurviveRecovery() {
        val source = WatchSource("HLS", "https://new.test/index.m3u8", label = "Mi OBS", waitForBroadcast = true, id = "obs")
        val item = WatchItem("a", "A", "", false, listOf(source), "/live/a", autoFailover = false)
        val state = PlaybackSnapshot(item, 0, true)
        assertEquals(state, PlaybackSnapshot.decode(state.encode()))
    }
}
