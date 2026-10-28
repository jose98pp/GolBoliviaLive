package com.golbolivialive.tv

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.os.Handler
import android.os.Looper
import android.util.LruCache
import android.widget.ImageView
import com.caverock.androidsvg.SVG
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class CrestImages(context: Context) {
    private val executor = Executors.newFixedThreadPool(3)
    private val handler = Handler(Looper.getMainLooper())
    private val disk = ImageDiskCache(File(context.cacheDir, "channel-images-v1"))
    private val failed = mutableMapOf<String, Long>()
    private val cache = object : LruCache<String, Bitmap>(6 * 1024 * 1024) {
        override fun sizeOf(key: String, value: Bitmap) = value.byteCount
    }
    private val pending = mutableMapOf<String, MutableList<java.lang.ref.WeakReference<ImageView>>>()
    private var closed = false

    fun load(value: String, view: ImageView) {
        val url = ImageUrls.normalize(value)
        if (closed || url.isBlank()) return
        view.tag = url
        cache.get(url)?.let { show(view, it); return }
        if (System.currentTimeMillis() - (failed[url] ?: 0L) < 60000) return
        val waiting = pending[url]
        if (waiting != null) { waiting.add(java.lang.ref.WeakReference(view)); return }
        pending[url] = mutableListOf(java.lang.ref.WeakReference(view))
        executor.execute {
            val bitmap = runCatching {
                val saved = disk.read(url)
                val cached = saved?.let { runCatching { decode(it) }.getOrNull() }
                if (cached != null) cached else {
                    if (saved != null) disk.remove(url)
                    val connection = URL(url).openConnection() as HttpURLConnection
                    connection.connectTimeout = 5000; connection.readTimeout = 5000
                    connection.setRequestProperty("Accept", "image/svg+xml,image/webp,image/png,image/jpeg,image/*;q=0.8")
                    try {
                        check(connection.responseCode == 200)
                        val bytes = connection.inputStream.use { it.readBytesLimited(2 * 1024 * 1024) }
                        decode(bytes).also { disk.write(url, bytes) }
                    } finally { connection.disconnect() }
                }
            }.getOrNull()
            handler.post {
                if (!closed && bitmap != null) { cache.put(url, bitmap); failed.remove(url) }
                else if (!closed) {
                    if (failed.size >= 512) failed.clear()
                    failed[url] = System.currentTimeMillis()
                }
                pending.remove(url)?.forEach { ref -> ref.get()?.takeIf { !closed && it.tag == url }?.let { target -> if (bitmap != null) show(target, bitmap) } }
            }
        }
    }

    private fun decode(bytes: ByteArray): Bitmap {
        val prefix = bytes.take(1024).toByteArray().toString(Charsets.UTF_8)
        if (prefix.contains("<svg", true) || prefix.contains("<?xml", true)) {
            val text = bytes.toString(Charsets.UTF_8)
            require(!text.contains("<!DOCTYPE", true) && !text.contains("<!ENTITY", true))
            val svg = SVG.getFromInputStream(bytes.inputStream())
            val picture = svg.renderToPicture(256, 256)
            return Bitmap.createBitmap(256, 256, Bitmap.Config.ARGB_8888).apply { Canvas(this).drawPicture(picture) }
        }
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        check(bounds.outWidth in 1..8192 && bounds.outHeight in 1..8192)
        val options = BitmapFactory.Options().apply {
            inSampleSize = Integer.highestOneBit((maxOf(bounds.outWidth, bounds.outHeight) / 256).coerceAtLeast(1))
        }
        return checkNotNull(BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options))
    }

    private fun java.io.InputStream.readBytesLimited(limit: Int): ByteArray {
        val output = java.io.ByteArrayOutputStream()
        val buffer = ByteArray(8192)
        while (true) {
            val count = read(buffer)
            if (count < 0) break
            check(output.size() + count <= limit)
            output.write(buffer, 0, count)
        }
        return output.toByteArray()
    }

    private fun show(view: ImageView, bitmap: Bitmap) {
        view.setImageBitmap(bitmap)
        (view.parent as? android.view.ViewGroup)?.getChildAt(0)?.takeIf { it !== view }?.visibility = android.view.View.INVISIBLE
    }

    fun close() { closed = true; executor.shutdownNow(); pending.clear(); failed.clear(); cache.evictAll(); handler.removeCallbacksAndMessages(null) }
}
