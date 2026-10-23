package com.golbolivialive.tv

import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.media3.common.MediaItem
import androidx.media3.common.AudioAttributes
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.HttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import java.util.concurrent.Executors

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class MainActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private val executor = Executors.newFixedThreadPool(2)
    private val preferences by lazy { getSharedPreferences("viewer", MODE_PRIVATE) }
    private val backgroundColor = Color.rgb(8, 13, 22)
    private val green = Color.rgb(54, 220, 150)
    private lateinit var root: LinearLayout
    private lateinit var body: LinearLayout
    private var matches = emptyList<WatchItem>()
    private var channels = emptyList<WatchItem>()
    private var section = "Inicio"
    private var query = ""
    private var page = 0
    private var loading = false
    private var notice = "Conectando con GolBoliviaLive…"
    private var selected: WatchItem? = null
    private var sourceIndex = 0
    private var player: ExoPlayer? = null
    private var playerView: PlayerView? = null
    private var playerStatus: TextView? = null
    private var resumePlayback = true
    private var returnFocus: String? = null
    private var active = false
    private var pendingLoads = 0
    private val refresh = object : Runnable {
        override fun run() {
            if (selected == null) loadCatalog()
            handler.postDelayed(this, 30000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        section = savedInstanceState?.getString("section") ?: "Inicio"
        query = savedInstanceState?.getString("query").orEmpty()
        window.decorView.setOnApplyWindowInsetsListener { view, insets ->
            view.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop,
                insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
            insets
        }
        render()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString("section", section)
        outState.putString("query", query)
        super.onSaveInstanceState(outState)
    }

    override fun onStart() {
        super.onStart()
        active = true
        if (selected != null) startPlayer() else loadCatalog()
        handler.postDelayed(refresh, 30000)
    }

    override fun onStop() {
        active = false
        handler.removeCallbacks(refresh)
        resumePlayback = player?.playWhenReady ?: resumePlayback
        releasePlayer()
        super.onStop()
    }

    override fun onDestroy() {
        executor.shutdownNow()
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun largeText() = preferences.getBoolean("largeText", false)
    private fun label(value: String, size: Float, muted: Boolean = false) = TextView(this).apply {
        text = value
        textSize = size * if (largeText()) 1.15f else 1f
        setTextColor(if (muted) Color.rgb(164, 177, 196) else Color.WHITE)
        setPadding(dp(4), dp(5), dp(4), dp(5))
    }

    private fun surface(focused: Boolean = false, featured: Boolean = false) = GradientDrawable(
        GradientDrawable.Orientation.TL_BR,
        if (featured) intArrayOf(Color.rgb(21, 65, 62), Color.rgb(17, 29, 46))
        else intArrayOf(Color.rgb(28, 39, 58), Color.rgb(17, 25, 40))
    ).apply {
        cornerRadius = dp(16).toFloat()
        setStroke(dp(if (focused) 3 else 1), if (focused) green else Color.rgb(47, 61, 80))
    }

    private fun focusable(view: View, tag: String) {
        view.tag = tag
        view.isFocusable = true
        view.isClickable = true
        view.background = surface()
        view.setOnFocusChangeListener { target, focused ->
            target.background = surface(focused)
            target.elevation = dp(if (focused) 8 else 0).toFloat()
            if (focused) target.parent?.requestChildFocus(target, target)
        }
    }

    private fun button(title: String, tag: String = title, action: () -> Unit) = Button(this).apply {
        text = title
        isAllCaps = false
        textSize = if (largeText()) 18f else 15f
        setTextColor(Color.WHITE)
        setPadding(dp(18), dp(8), dp(18), dp(8))
        minimumHeight = dp(52)
        focusable(this, tag)
        setOnClickListener { action() }
        layoutParams = LinearLayout.LayoutParams(-2, -2).apply { setMargins(dp(4), dp(4), dp(4), dp(4)) }
    }

    private fun favorites() = preferences.getStringSet("favorites", emptySet()).orEmpty()
    private fun toggleFavorite(item: WatchItem) {
        val updated = favorites().toMutableSet()
        if (!updated.add(item.id)) updated.remove(item.id)
        preferences.edit().putStringSet("favorites", updated).apply()
        Toast.makeText(this, if (item.id in updated) "Guardado en favoritos" else "Quitado de favoritos", Toast.LENGTH_SHORT).show()
    }

    private fun render(focusTag: String? = null) {
        if (selected != null || isDestroyed) return
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(backgroundColor)
            setPadding(dp(24), dp(12), dp(24), dp(12))
        }
        setContentView(root)
        val header = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        header.addView(label("GOLBOLIVIA  LIVE", 21f).apply {
            setTextColor(green); setTypeface(typeface, Typeface.BOLD)
        }, LinearLayout.LayoutParams(0, -2, 1f))
        header.addView(button("Buscar") { search() })
        root.addView(header)
        val nav = LinearLayout(this)
        listOf("Inicio", "Partidos", "Canales", "Favoritos", "Ajustes").forEach { tab ->
            nav.addView(button(if (section == tab) "• $tab" else tab, "nav:$tab") {
                section = tab; page = 0; render("nav:$tab")
            })
        }
        root.addView(HorizontalScrollView(this).apply {
            isHorizontalScrollBarEnabled = false; addView(nav)
        })
        body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(4), dp(12), dp(4), dp(32)) }
        root.addView(ScrollView(this).apply { isFillViewport = true; addView(body) }, LinearLayout.LayoutParams(-1, 0, 1f))
        if (section == "Ajustes") settings() else {
            if (notice.isNotBlank()) body.addView(label(notice, 14f, true))
            if (query.isNotBlank()) {
                body.addView(label("Resultados para «$query»", 22f))
                body.addView(button("Quitar búsqueda") { query = ""; page = 0; render() })
            }
            fun filtered(items: List<WatchItem>) = items.filter {
                query.isBlank() || (it.title + " " + it.subtitle).contains(query, ignoreCase = true)
            }
            when (section) {
                "Inicio" -> {
                    val live = filtered(matches).filter { it.live }
                    live.firstOrNull()?.let { featured ->
                        body.addView(label("TU CANCHA. TU PANTALLA.", 13f, true))
                        body.addView(label(featured.title, 34f).apply { setTypeface(typeface, Typeface.BOLD) })
                        body.addView(label(featured.subtitle, 16f, true))
                        body.addView(button("▶ Ver en vivo", "hero:${featured.id}") { open(featured) })
                    }
                    row("En vivo", live)
                    row("Más partidos", filtered(matches).filter { !it.live })
                    row("Tus favoritos", filtered(matches + channels).filter { it.id in favorites() })
                    row("Explorar canales", filtered(channels).take(24))
                }
                "Partidos" -> grid("Partidos", filtered(matches))
                "Canales" -> grid("Canales", filtered(channels))
                "Favoritos" -> grid("Tus favoritos", filtered(matches + channels).filter { it.id in favorites() })
            }
            body.addView(button(if (loading) "Actualizando…" else "Actualizar catálogo") { loadCatalog() })
        }
        val target = focusTag?.let { root.findViewWithTag<View>(it) }
            ?: root.findViewWithTag("nav:$section")
        target?.post { target.requestFocus() }
    }

    private fun card(item: WatchItem, width: Int): View = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(18), dp(14), dp(18), dp(14))
        layoutParams = LinearLayout.LayoutParams(dp(width), dp(if (largeText()) 200 else 170)).apply {
            setMargins(dp(5), dp(8), dp(10), dp(8))
        }
        focusable(this, item.id)
        contentDescription = "${item.title}. ${item.subtitle}. ${if (item.live) "En vivo" else ""}. Pulsa OK para abrir. Mantén OK para favoritos."
        addView(label(if (item.live) "● EN VIVO" else if (item.channel) "TV · CANAL" else "PARTIDO", 12f).apply { setTextColor(green) })
        addView(label(item.title, 20f).apply {
            maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END
            setTypeface(typeface, Typeface.BOLD)
        }, LinearLayout.LayoutParams(-1, 0, 1f))
        addView(label((if (item.id in favorites()) "★ " else "") + item.subtitle, 13f, true).apply {
            maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END
        })
        setOnClickListener { open(item) }
        setOnLongClickListener { toggleFavorite(item); render(item.id); true }
    }

    private fun row(title: String, items: List<WatchItem>) {
        body.addView(label(title, 23f))
        if (items.isEmpty()) { body.addView(label("Sin contenido disponible en esta sección.", 15f, true)); return }
        val rail = LinearLayout(this)
        items.forEach { rail.addView(card(it, 260)) }
        body.addView(HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false; addView(rail) })
    }

    private fun grid(title: String, items: List<WatchItem>) {
        body.addView(label("$title · ${items.size}", 26f))
        if (items.isEmpty()) body.addView(label("Sin resultados. Puedes buscar otro nombre o actualizar.", 16f, true))
        val width = resources.configuration.screenWidthDp - 70
        val columns = if (width >= 820) 3 else if (width >= 480) 2 else 1
        val slice = items.drop(page * 24).take(24)
        slice.chunked(columns).forEach { group ->
            body.addView(LinearLayout(this).apply { group.forEach { addView(card(it, width / columns - 16)) } })
        }
        val pagination = LinearLayout(this)
        if (page > 0) pagination.addView(button("Anterior") { page--; render() })
        if ((page + 1) * 24 < items.size) pagination.addView(button("Siguiente") { page++; render() })
        body.addView(pagination)
    }

    private fun search() {
        val input = EditText(this).apply { setText(query); hint = "Nombre de partido, canal o país"; setSingleLine() }
        AlertDialog.Builder(this).setTitle("Buscar").setView(input)
            .setPositiveButton("Buscar") { _, _ -> query = input.text.toString().trim(); page = 0; render() }
            .setNegativeButton("Cancelar", null).show()
    }

    private fun settings() {
        body.addView(label("A tu manera", 32f))
        body.addView(label("Flechas: navegar · OK: abrir · Atrás: volver\nMantén OK sobre una tarjeta para guardarla en favoritos.\nDurante el video: OK muestra los controles; Play/Pausa controla la reproducción.", 17f, true))
        fun toggle(key: String, title: String, default: Boolean) {
            body.addView(button("$title: ${if (preferences.getBoolean(key, default)) "Activado" else "Desactivado"}", key) {
                preferences.edit().putBoolean(key, !preferences.getBoolean(key, default)).apply(); render(key)
            })
        }
        toggle("autoplay", "Reproducir al abrir", true)
        toggle("channelKeys", "CH+ / CH− cambia de canal", true)
        toggle("largeText", "Texto grande", false)
        body.addView(button("Configurar mando Bluetooth") {
            try { startActivity(Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS)) }
            catch (_: ActivityNotFoundException) {
                Toast.makeText(this, "Abre Ajustes de Android → Mandos y accesorios para emparejar tu mando.", Toast.LENGTH_LONG).show()
            }
        })
        body.addView(button("Calidad: ${preferences.getString("quality", "Automática")}", "quality") {
            val labels = arrayOf("Automática", "Ahorro de datos · hasta 480p", "HD · hasta 720p", "Full HD · hasta 1080p")
            AlertDialog.Builder(this).setTitle("Calidad máxima").setItems(labels) { _, which ->
                preferences.edit().putString("quality", labels[which]).putInt("maxHeight", intArrayOf(Int.MAX_VALUE, 480, 720, 1080)[which]).apply()
                render("quality")
            }.show()
        })
        body.addView(label("El volumen se controla con los botones del dispositivo o del televisor.\nYouTube, Kick y páginas externas se abren en la web pública.\nGolBoliviaLive · Versión ${BuildConfig.VERSION_NAME}", 14f, true))
    }

    private fun loadCatalog() {
        if (loading || !active) return
        loading = true
        pendingLoads = 2
        val previousMatches = matches
        val previousChannels = channels
        val previousNotice = notice
        listOf("/api/live-events", "/api/iptv/sports").forEach { path ->
            executor.execute {
                val result = runCatching {
                    val json = Catalog.fetch(path)
                    if (path.endsWith("sports")) Catalog.channels(json) else Catalog.matches(json)
                }
                handler.post {
                    if (isDestroyed) return@post
                    val focus = currentFocus?.tag as? String
                    result.onSuccess {
                        if (path.endsWith("sports")) channels = it else matches = it
                    }
                    if (pendingLoads == 2) notice = ""
                    result.onFailure { notice += "No se pudo actualizar ${if (path.endsWith("sports")) "los canales" else "los partidos"}. Se conserva el catálogo anterior. " }
                    pendingLoads--
                    if (pendingLoads == 0) {
                        loading = false
                        if (active && selected == null) {
                            if (notice.isBlank()) notice = "Catálogo actualizado · Mantén OK para favoritos"
                            val itemCount = when (section) { "Canales" -> channels.size; "Partidos" -> matches.size; else -> (matches + channels).size }
                            if (page * 24 >= itemCount) page = 0
                            if (matches != previousMatches || channels != previousChannels || notice != previousNotice) render(focus)
                        }
                    }
                }
            }
        }
    }

    private fun open(item: WatchItem) {
        returnFocus = item.id
        if (item.streams.isEmpty()) {
            AlertDialog.Builder(this).setTitle(item.title)
                .setMessage("Esta señal utiliza un reproductor web. Se abrirá en el navegador del dispositivo.")
                .setPositiveButton("Abrir web") { _, _ -> openWeb(item) }
                .setNeutralButton(if (item.id in favorites()) "Quitar favorito" else "Guardar favorito") { _, _ -> toggleFavorite(item) }
                .setNegativeButton("Cancelar", null).show()
            return
        }
        releasePlayer()
        selected = item
        sourceIndex = 0
        resumePlayback = preferences.getBoolean("autoplay", true)
        val screen = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setBackgroundColor(backgroundColor); setPadding(dp(20), dp(12), dp(20), dp(12)) }
        screen.addView(label(item.title, 22f))
        playerView = PlayerView(this).apply {
            useController = true; controllerShowTimeoutMs = 5000; isFocusable = true
            setShowNextButton(false); setShowPreviousButton(false)
        }
        screen.addView(playerView, LinearLayout.LayoutParams(-1, 0, 1f))
        playerStatus = label("Preparando señal…", 14f, true)
        screen.addView(playerStatus)
        screen.addView(HorizontalScrollView(this).apply {
            addView(LinearLayout(this@MainActivity).apply {
                addView(button("Volver") { closePlayer() })
                addView(button("Reintentar") { sourceIndex = 0; startPlayer() })
                addView(button("Favorito ★") { toggleFavorite(item) })
                addView(button("Ver en la web") { openWeb(item) })
            })
        })
        setContentView(screen)
        startPlayer()
        playerView?.requestFocus()
    }

    private fun startPlayer() {
        val item = selected ?: return
        if (!active) return
        releasePlayer()
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val instance = ExoPlayer.Builder(this).build()
        instance.setAudioAttributes(AudioAttributes.DEFAULT, true)
        player = instance
        playerView?.player = instance
        instance.trackSelectionParameters = instance.trackSelectionParameters.buildUpon()
            .setMaxVideoSize(Int.MAX_VALUE, preferences.getInt("maxHeight", Int.MAX_VALUE)).build()
        instance.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                if (player !== instance) return
                playerStatus?.text = when (state) {
                    Player.STATE_BUFFERING -> "Cargando señal ${sourceIndex + 1}…"
                    Player.STATE_READY -> "Señal ${sourceIndex + 1} · OK: controles · Atrás: catálogo"
                    Player.STATE_ENDED -> "La transmisión ha terminado."
                    else -> "Preparando señal…"
                }
            }
            override fun onPlayerError(error: PlaybackException) {
                if (player !== instance) return
                var cause: Throwable? = error
                var status: Int? = null
                while (cause != null) {
                    if (cause is HttpDataSource.InvalidResponseCodeException) status = cause.responseCode
                    cause = cause.cause
                }
                if (sourceIndex + 1 < item.streams.size) {
                    resumePlayback = instance.playWhenReady
                    sourceIndex++
                    handler.post { if (active && selected == item && player === instance) startPlayer() }
                } else {
                    playerStatus?.text = when (status) {
                        403 -> "HTTP 403: el proveedor denegó el acceso a esta señal."
                        404 -> "HTTP 404: la señal ya no está disponible."
                        null -> "No se pudo reproducir (${error.errorCodeName}). Reintenta o abre la web."
                        else -> "Error HTTP $status del proveedor. Puedes reintentar o abrir la web."
                    }
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
        })
        val stream = item.streams[sourceIndex]
        val media = MediaItem.Builder().setUri(stream)
        if (!Uri.parse(stream).path.orEmpty().endsWith(".mp4", ignoreCase = true)) media.setMimeType(MimeTypes.APPLICATION_M3U8)
        instance.setMediaItem(media.build())
        instance.prepare()
        instance.playWhenReady = resumePlayback
    }

    private fun releasePlayer() {
        playerView?.player = null
        player?.release()
        player = null
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun closePlayer() {
        releasePlayer(); selected = null; playerView = null; playerStatus = null
        render(returnFocus)
    }

    private fun openWeb(item: WatchItem) {
        player?.pause()
        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.PUBLIC_BASE_URL + item.webPath))) }
        catch (_: ActivityNotFoundException) {
            AlertDialog.Builder(this).setTitle("Navegador no disponible")
                .setMessage("Abre esta dirección en otro dispositivo:\n${BuildConfig.PUBLIC_BASE_URL}${item.webPath}")
                .setPositiveButton("Aceptar", null).show()
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (selected != null && event.keyCode in listOf(KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_MEDIA_PLAY, KeyEvent.KEYCODE_MEDIA_PAUSE)) {
            if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) player?.let {
                it.playWhenReady = when (event.keyCode) {
                    KeyEvent.KEYCODE_MEDIA_PLAY -> true
                    KeyEvent.KEYCODE_MEDIA_PAUSE -> false
                    else -> !it.playWhenReady
                }
            }
            return true
        }
        if (selected?.channel == true && preferences.getBoolean("channelKeys", true) &&
            event.keyCode in listOf(KeyEvent.KEYCODE_CHANNEL_UP, KeyEvent.KEYCODE_CHANNEL_DOWN)) {
            if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
                val playable = channels.filter { it.streams.isNotEmpty() }
                val index = playable.indexOfFirst { it.id == selected?.id }
                if (index >= 0 && playable.isNotEmpty()) {
                    val step = if (event.keyCode == KeyEvent.KEYCODE_CHANNEL_UP) 1 else -1
                    open(playable[(index + step + playable.size) % playable.size])
                }
            }
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    @Deprecated("Compatible with Android TV remotes on API 23+")
    override fun onBackPressed() {
        if (selected != null) { closePlayer(); return }
        if (section != "Inicio" || query.isNotBlank()) { section = "Inicio"; query = ""; page = 0; render(); return }
        AlertDialog.Builder(this).setTitle("¿Salir de GolBoliviaLive?")
            .setPositiveButton("Salir") { _, _ -> finish() }.setNegativeButton("Seguir viendo", null).show()
    }
}
