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

    @Test fun iframeChannelsAndYoutubeUseEmbeddedPlayers() {
        val channel = Catalog.channels(JSONObject("""{"channels":[{"id":"web/a","name":"Canal","sourceType":"iframe","streamUrl":"https://example.com/embed"}]}""")).single()
        assertTrue(channel.streams.isEmpty())
        assertEquals("/tv/web%2Fa", channel.webPath)
        val youtube = Catalog.matches(JSONObject("""{"events":[{"id":"b","primaryProvider":"youtube","youtube":{"videoId":"abcdefghijk"},"autoFailoverEnabled":false}]}""")).single()
        assertTrue(youtube.streams.isEmpty())
        assertEquals(WatchSource("YouTube", "https://www.youtube.com/embed/abcdefghijk", true), youtube.sources.single())
        assertTrue(channel.sources.single().embedded)
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
    @Test fun statesPrioritizeFinalAndHalftimeOverLiveFlag() {
        val cases = listOf(
            "{\"isLive\":true,\"period\":\"Finalizado\"}" to ("FINALIZADO" to "finished"),
            "{\"isLive\":true,\"period\":\"Descanso\"}" to ("ENTRETIEMPO" to "live"),
            "{\"isLive\":false,\"broadcastMode\":\"pre_match\"}" to ("PROGRAMADO" to "today"),
            "{\"isLive\":true,\"period\":\"Revisión VAR\"}" to ("REVISIÓN VAR" to "live"),
            "{\"isLive\":true,\"period\":\"2T\",\"displayClock\":\"75:32\"}" to ("EN VIVO · 2T · 75:32" to "live"))
        cases.forEach { (json, expected) ->
            assertEquals(MatchStatus(expected.first, expected.second), Catalog.status(JSONObject(json)))
        }
    }

    @Test fun scoreboardUsesServerValuesAndResolvesTeams() {
        val data = JSONObject("""{"events":[{"id":"x","homeTeam":"bolivar","awayTeam":"oriente","isLive":true,"period":"2T","homeScore":2,"awayScore":1}]}""")
        val home = TeamInfo("bolivar", "Bolívar", "https://example.com/crest.png", "#0284c7")
        val item = Catalog.matches(data, mapOf("bolivar" to home)).single()
        assertEquals(home, item.home)
        assertEquals("2 – 1", item.score)
        val next = data.getJSONArray("events").getJSONObject(0)
        next.remove("homeScore")
        assertEquals("VS", Catalog.matches(data).single().score)
        next.put("broadcastMode", "pre_match")
        assertEquals("VS", Catalog.matches(data).single().score)
    }

    @Test fun respectsConfiguredOrderForNativeAndEmbeddedFallbacks() {
        val data = JSONObject("""{"events":[{"id":"m","primaryProvider":"youtube","youtube":{"videoId":"abcdefghijk"},"kick":{"channel":"golbolivia"},"cloudflare":{"playbackUrl":"https://example.com/live.m3u8"},"fallbackOrder":["youtube","kick","cloudflare"],"autoFailoverEnabled":true}]}""")
        val item = Catalog.matches(data).single()
        assertEquals(listOf("YouTube", "Kick", "HLS"), item.sources.map { it.provider })
        assertEquals(listOf(true, true, false), item.sources.map { it.embedded })
        data.getJSONArray("events").getJSONObject(0).put("autoFailoverEnabled", false)
        assertEquals(listOf("YouTube"), Catalog.matches(data).single().sources.map { it.provider })
    }

    @Test fun externalPlayerIsEmbeddedAndInvalidVideoIdIsRejected() {
        val external = Catalog.matches(JSONObject("""{"events":[{"id":"x","primaryProvider":"external","externalSource":{"url":"https://example.com/embed"}}]}""")).single()
        assertTrue(external.sources.single().embedded)
        val invalid = Catalog.matches(JSONObject("""{"events":[{"id":"x","primaryProvider":"youtube","youtube":{"videoId":"../bad?id=x"}}]}""")).single()
        assertTrue(invalid.sources.isEmpty())
    }

    @Test fun crestPathsAndNamesUseExistingCatalogConventions() {
        assertEquals("https://golbolivialive-beta.vercel.app/crests/arsenal.png", TeamCatalog.crest("/crests/arsenal.png"))
        assertEquals("", TeamCatalog.crest("/admin/private.png"))
        assertEquals("bolivar", TeamCatalog.normalize("Club Bolívar FC"))
        assertEquals("", TeamCatalog.crest("http://example.com/image.png"))
    }

    @Test fun providerLinksInIframeChannelsUseTheOfficialEmbed() {
        assertEquals(WatchSource("YouTube", "https://www.youtube.com/embed/abcdefghijk", true),
            Catalog.embeddedSource("https://youtu.be/abcdefghijk", "Canal"))
        assertEquals(WatchSource("Kick", "https://player.kick.com/golbolivia", true),
            Catalog.embeddedSource("https://kick.com/golbolivia", "Web"))
        assertNull(Catalog.embeddedSource("https://www.youtube.com/embed/invalid", "Web"))
    }

}
