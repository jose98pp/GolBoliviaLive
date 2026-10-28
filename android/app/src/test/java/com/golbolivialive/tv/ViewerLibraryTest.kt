package com.golbolivialive.tv

import org.junit.Assert.*
import org.junit.Test

class ViewerLibraryTest {
    @Test fun recentlyOpenedContentIsBoundedAndDeduplicatedWithoutSavingUrls() {
        var value: String? = null
        for (index in 0..20) value = ViewerLibrary.remember(ViewerLibrary.recentIds(value), "match:$index")
        value = ViewerLibrary.remember(ViewerLibrary.recentIds(value), "match:15")
        val ids = ViewerLibrary.recentIds(value)
        assertEquals(12, ids.size)
        assertEquals("match:15", ids.first())
        assertEquals(1, ids.count { it == "match:15" })
        assertFalse(value.contains("https://"))
    }
    @Test fun invalidStorageAndRemovedItemsNeverResurrectOldPlaybackUrls() {
        assertTrue(ViewerLibrary.recentIds("invalid").isEmpty())
        val item = WatchItem("channel:b", "B", "", false, emptyList(), "/tv/b", true)
        assertEquals(listOf(item), ViewerLibrary.available(listOf("match:removed", "channel:b"), listOf(item)))
        assertEquals(listOf("channel:b"), ViewerLibrary.recentIds("[\"https://secret.test\",\"channel:b\"]"))
    }
}
