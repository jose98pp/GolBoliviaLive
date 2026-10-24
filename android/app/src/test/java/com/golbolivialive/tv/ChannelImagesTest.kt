package com.golbolivialive.tv

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files

class ChannelImagesTest {
    @Test fun normalizesImportedLogosWithoutAllowingLocalOrScriptContent() {
        assertEquals("https://cdn.test/a%20b.svg", ImageUrls.normalize(" http://cdn.test/a b.svg "))
        assertEquals("https://cdn.test/logo.png", ImageUrls.normalize("//cdn.test/logo.png"))
        assertEquals(BuildConfig.PUBLIC_BASE_URL + "/images/logo.png", ImageUrls.normalize("/images/logo.png"))
        listOf("file:///sdcard/logo.png", "javascript:alert(1)", "data:image/png,xxx", "https://user:password@cdn.test/a.png", "").forEach {
            assertEquals("", ImageUrls.normalize(it))
        }
    }
    @Test fun channelArtworkSurvivesCatalogAndPlaybackRecovery() {
        val raw = JSONObject("""{"channels":[{"id":"tv","name":"Canal","logo":"http://cdn.test/channel.svg","sourceType":"hls","streamUrl":"https://video.test/live.m3u8"}]}""")
        val restoredCatalog = Catalog.channels(JSONObject(raw.toString())).single()
        assertEquals("https://cdn.test/channel.svg", restoredCatalog.logo)
        val recovered = PlaybackSnapshot.decode(PlaybackSnapshot(restoredCatalog, 0, true).encode())!!.item
        assertEquals(restoredCatalog.logo, recovered.logo)
        assertEquals("https://video.test/live.m3u8", recovered.streams.single())
    }
    @Test fun fallsBackToValidImageAliasWhenCanonicalLogoIsBlankOrInvalid() {
        val raw = JSONObject("""{"channels":[{"id":"tv","name":"Canal","logo":"javascript:bad","logoUrl":"https://cdn.test/logo.webp","streamUrl":"https://video.test/live.m3u8"}]}""")
        assertEquals("https://cdn.test/logo.webp", Catalog.channels(raw).single().logo)
    }
    @Test fun diskArtworkIsReusableByAnotherCacheInstanceAndExpires() {
        val directory = Files.createTempDirectory("channel-art").toFile()
        var clock = System.currentTimeMillis()
        try {
            val first = ImageDiskCache(directory, ttlMs = 1000, now = { clock })
            val bytes = "image content".toByteArray()
            first.write("https://cdn.test/a.svg?version=1", bytes)
            assertArrayEquals(bytes, ImageDiskCache(directory, now = { clock }).read("https://cdn.test/a.svg?version=1"))
            assertNull(first.read("https://cdn.test/a.svg?version=2"))
            clock += 2000
            assertNull(first.read("https://cdn.test/a.svg?version=1"))
        } finally { directory.deleteRecursively() }
    }
    @Test fun diskBudgetEvictsOldImagesAndRejectsEmptyOrOversizedEntries() {
        val directory = Files.createTempDirectory("channel-budget").toFile()
        var clock = System.currentTimeMillis()
        try {
            val cache = ImageDiskCache(directory, maxBytes = 6, now = { clock })
            cache.write("a", byteArrayOf(1, 2, 3, 4)); clock += 1000
            cache.write("b", byteArrayOf(5, 6, 7, 8))
            assertNull(cache.read("a")); assertArrayEquals(byteArrayOf(5, 6, 7, 8), cache.read("b"))
            cache.write("empty", byteArrayOf()); cache.write("huge", ByteArray(2 * 1024 * 1024 + 1))
            assertNull(cache.read("empty")); assertNull(cache.read("huge"))
        } finally { directory.deleteRecursively() }
    }
}
