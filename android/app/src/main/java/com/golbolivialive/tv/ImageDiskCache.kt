package com.golbolivialive.tv

import java.io.File
import java.security.MessageDigest

class ImageDiskCache(private val directory: File, private val maxBytes: Long = 32L * 1024 * 1024,
    private val ttlMs: Long = 6L * 60 * 60 * 1000, private val now: () -> Long = { System.currentTimeMillis() }) {
    private fun file(url: String) = File(directory, MessageDigest.getInstance("SHA-256").digest(url.toByteArray())
        .joinToString("") { "%02x".format(it) } + ".img")

    @Synchronized fun read(url: String): ByteArray? = runCatching {
        val entry = file(url)
        if (!entry.exists()) return null
        if (entry.length() !in 1..2L * 1024 * 1024 || now() - entry.lastModified() > ttlMs) { entry.delete(); return null }
        entry.readBytes()
    }.getOrNull()

    @Synchronized fun write(url: String, bytes: ByteArray) {
        if (bytes.isEmpty() || bytes.size > 2 * 1024 * 1024) return
        runCatching {
            directory.mkdirs()
            val target = file(url)
            val temp = File(directory, target.name + ".tmp")
            temp.writeBytes(bytes)
            if (temp.renameTo(target)) target.setLastModified(now()) else temp.delete()
            val entries = directory.listFiles()?.filter { it.extension == "img" }?.sortedBy { it.lastModified() }.orEmpty()
            var size = entries.sumOf { it.length() }
            for (entry in entries) {
                if (size <= maxBytes) break
                val length = entry.length()
                if (entry.delete()) size -= length
            }
        }
    }

    @Synchronized fun remove(url: String) { file(url).delete() }
}
