package com.golbolivialive.tv

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class CatalogTest {
    @Test fun matchesUsePublicPlaybackAndNeverIngestCredentials() {
        val item = Catalog.matches(JSONObject("""{"events":[{"id":"a","title":"Bolívar vs Oriente","primaryProvider":"cloudflare","isLive":true,"cloudflare":{"playbackUrl":"https://example.com/live.m3u8"},"rtmpServer":"rtmp://private","streamKey":"secret","backupVideoUrl":"https://example.com/backup.m3u8"}]}""")).single()
        assertEquals(listOf("https://example.com/live.m3u8", "https://example.com/backup.m3u8"), item.streams)
        assertTrue(item.live)
        assertEquals("/live/a", item.webPath)
    }

    @Test fun iframeChannelsAndYoutubeRemainWebSources() {
        val channel = Catalog.channels(JSONObject("""{"channels":[{"id":"web/a","name":"Canal","sourceType":"iframe","streamUrl":"https://example.com/embed"}]}""")).single()
        assertTrue(channel.streams.isEmpty())
        assertEquals("/tv/web%2Fa", channel.webPath)
        val youtube = Catalog.matches(JSONObject("""{"events":[{"id":"b","primaryProvider":"youtube","youtube":{"videoId":"xyz"},"backupVideoUrl":"https://example.com/backup.m3u8"}]}""")).single()
        assertTrue(youtube.streams.isEmpty())
    }

    @Test fun respectsBackupSelectionAndFailoverDisabled() {
        val item = Catalog.matches(JSONObject("""{"events":[{"id":"b","primaryProvider":"cloudflare","customVideoUrl":"https://example.com/live.m3u8","backupVideoUrl":"https://example.com/backup.m3u8","autoFailoverEnabled":false}]}""")).single()
        assertEquals(listOf("https://example.com/live.m3u8"), item.streams)
        val backup = Catalog.matches(JSONObject("""{"events":[{"id":"b","primaryProvider":"cloudflare","activeStreamSource":"backup","customVideoUrl":"https://example.com/live.m3u8","backupVideoUrl":"https://example.com/backup.m3u8","autoFailoverEnabled":false}]}""")).single()
        assertEquals(listOf("https://example.com/backup.m3u8"), backup.streams)
    }

    @Test fun noFakeContentOnEmptyCatalogAndRejectsNonHttps() {
        assertTrue(Catalog.matches(JSONObject("""{"events":[]}""")).isEmpty())
        assertTrue(Catalog.channels(JSONObject("""{"channels":[]}""")).isEmpty())
        assertNull(Catalog.https("http://example.com/live.m3u8"))
        assertNull(Catalog.https("https://user:password@example.com/live.m3u8"))
        assertNull(Catalog.https("javascript:alert(1)"))
        assertEquals("https://example.com/live.m3u8", Catalog.https("https://example.com/live.m3u8"))
    }
}
