package com.golbolivialive.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.FrameLayout
import org.json.JSONObject
import java.net.URI

@SuppressLint("SetJavaScriptEnabled")
class EmbeddedPlayer(context: Context, private val source: WatchSource, autoplay: Boolean,
    private val status: (String) -> Unit) : FrameLayout(context) {
    private val web = WebView(context)
    private val handler = Handler(Looper.getMainLooper())
    private var fullView: View? = null
    private var fullCallback: WebChromeClient.CustomViewCallback? = null
    private var closed = false
    private var failed = false
    private var originalUi = 0
    private val reminder = Runnable { if (!closed) status("Si el video no comienza, pulsa Reintentar o Siguiente señal.") }

    init {
        setBackgroundColor(Color.BLACK)
        addView(web, LayoutParams(-1, -1))
        web.setBackgroundColor(Color.BLACK)
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = !autoplay
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
        }
        web.webViewClient = object : WebViewClient() {
            @Deprecated("Used on Android 6")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean = !allowed(url)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val blocked = !allowed(request.url.toString())
                if (blocked && request.isForMainFrame) status("El enlace del proveedor no está disponible dentro de este reproductor.")
                return blocked
            }
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame && !closed) { failed = true; handler.removeCallbacks(reminder); status("No se pudo cargar ${source.provider}. Reintenta o cambia de señal.") }
            }
            override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: WebResourceResponse) {
                if (request.isForMainFrame && !closed) { failed = true; handler.removeCallbacks(reminder); status("${source.provider}: HTTP ${response.statusCode}. El proveedor no pudo servir el reproductor.") }
            }
            override fun onPageFinished(view: WebView, url: String) {
                if (!closed && !failed) status("${source.provider} dentro de la app · Usa los controles del video · Menú: opciones · Atrás: volver")
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                if (fullView != null) { callback.onCustomViewHidden(); return }
                fullView = view; fullCallback = callback; web.visibility = View.GONE
                val decor = (context as Activity).window.decorView as ViewGroup
                originalUi = decor.systemUiVisibility
                decor.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                decor.addView(view, ViewGroup.LayoutParams(-1, -1)); view.requestFocus()
            }
            override fun onHideCustomView() { exitFullscreen() }
            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                if (closed || source.provider != "YouTube") return false
                val value = message.message()
                if (value.startsWith("GBL_YT_ERROR:")) {
                    failed = true
                    handler.removeCallbacks(reminder)
                    val code = value.substringAfter(':').toIntOrNull()
                    status(when (code) {
                        101, 150 -> "YouTube: el propietario no permite reproducir este video en aplicaciones integradas."
                        100 -> "YouTube: el video no está disponible o es privado."
                        153 -> "YouTube: no se pudo verificar la identificación de la app (153)."
                        else -> "YouTube no pudo reproducir el video (código $code). Reintenta o cambia de señal."
                    })
                    return true
                }
                if (value == "GBL_YT_PLAYING") { handler.removeCallbacks(reminder); status("YouTube · Reproduciendo dentro de GolBoliviaLive"); return true }
                if (value == "GBL_YT_BLOCKED") { status("Pulsa reproducir en el video para iniciar YouTube."); return true }
                return false
            }
        }
        if (source.provider == "YouTube") {
            val identity = EmbedDocument.origin
            val video = URI(source.url).path.substringAfterLast('/')
            val origin = JSONObject.quote(identity.removeSuffix("/"))
            web.loadDataWithBaseURL(identity, """<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body,#player{margin:0;width:100%;height:100%;background:#000;overflow:hidden}</style></head><body><div id="player"></div><script src="https://www.youtube.com/iframe_api"></script><script>
                var ytplayer;function onYouTubeIframeAPIReady(){ytplayer=new YT.Player('player',{videoId:${JSONObject.quote(video)},playerVars:{autoplay:${if (autoplay) 1 else 0},playsinline:1,controls:1,rel:0,enablejsapi:1,origin:$origin,widget_referrer:$origin},events:{onError:function(e){console.log('GBL_YT_ERROR:'+e.data)},onStateChange:function(e){if(e.data===1)console.log('GBL_YT_PLAYING')},onAutoplayBlocked:function(){console.log('GBL_YT_BLOCKED')}}});}
                </script></body></html>""".trimIndent(), "text/html", "UTF-8", null)
        } else {
            web.loadDataWithBaseURL(EmbedDocument.origin, EmbedDocument.iframe(source, autoplay), "text/html", "UTF-8", null)
        }
        handler.postDelayed(reminder, 25000)
        web.isFocusable = true
        web.isFocusableInTouchMode = true
        web.requestFocus()
    }

    private fun allowed(value: String): Boolean {
        if (Catalog.https(value) == null) return false
        val host = runCatching { URI(value).host }.getOrNull()
        if (host == BuildConfig.APPLICATION_ID) return true
        return when (source.provider) {
            "YouTube" -> host in setOf("www.youtube.com", "www.youtube-nocookie.com", BuildConfig.APPLICATION_ID)
            "Kick" -> host == "player.kick.com"
            else -> host == URI(source.url).host
        }
    }

    fun mediaKey(play: Boolean? = null): Boolean {
        if (source.provider != "YouTube") return false
        val command = when (play) { true -> "ytplayer.playVideo()"; false -> "ytplayer.pauseVideo()"; null -> "ytplayer.getPlayerState()===1?ytplayer.pauseVideo():ytplayer.playVideo()" }
        web.evaluateJavascript("if(window.ytplayer&&typeof ytplayer.playVideo==='function'){$command;}", null)
        return true
    }

    fun exitFullscreen(): Boolean {
        val view = fullView ?: return false
        (view.parent as? ViewGroup)?.removeView(view); fullView = null; web.visibility = View.VISIBLE
        (context as Activity).window.decorView.systemUiVisibility = originalUi
        val callback = fullCallback; fullCallback = null; callback?.onCustomViewHidden(); web.requestFocus()
        return true
    }

    fun focusVideo() { web.requestFocus() }

    fun close() {
        closed = true; handler.removeCallbacksAndMessages(null); exitFullscreen()
        web.stopLoading(); web.loadUrl("about:blank"); web.onPause()
        removeView(web); web.removeAllViews(); web.destroy()
    }
}
