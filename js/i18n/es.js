/**
 * Spanish translations
 * @lang es
 */
export default {
    // Header
    header: {
        title: "Gmail Tool v0.5",
        subtitle: "Sistema Profesional de Gestión de Correo Electrónico"
    },
    
    // Authentication
    auth: {
        welcome: "Bienvenido a Gmail Tool",
        signInDescription: "Inicia sesión con tu cuenta de Google para comenzar",
        signInButton: "Iniciar sesión con Google",
        signOut: "Cerrar sesión",
        dataPrivacy: "Tus datos permanecen en tu navegador",
        requiresAccess: "Esta aplicación requiere acceso a Gmail"
    },
    
    // Navigation Tabs
    tabs: {
        batchSender: "Envío Masivo de Correos",
        emailDownloader: "Descargador de Correos"
    },
    
    // Email Downloader
    downloader: {
        title: "📥 Descargar Correos",
        subtitle: "Buscar, seleccionar y descargar tus correos con archivos adjuntos",
        filtersTitle: "Filtros de Búsqueda",
        dateFrom: "Fecha Desde",
        dateTo: "Fecha Hasta",
        fromSender: "De (Remitente)",
        toRecipient: "Para (Destinatario)",
        emailPlaceholder: "ejemplo@gmail.com",
        subjectContains: "Asunto Contiene",
        subjectPlaceholder: "Palabras clave en el asunto",
        labels: "Etiquetas",
        ctrlClickMultiple: "Ctrl+Clic para selección múltiple",
        options: "Opciones",
        withAttachments: "Solo con archivos adjuntos",
        unreadOnly: "Solo no leídos",
        starred: "Solo destacados",
        important: "Solo importantes",
        advancedSearch: "🔍 Búsqueda Avanzada",
        customQuery: "Consulta de Gmail Personalizada",
        guide: "ℹ️ Guía",
        queryPlaceholder: "ej: has:attachment larger:5M after:2024/1/1",
        searchEmails: "🔍 Buscar Correos",
        clearFilters: "🗑️ Limpiar Filtros",
        maxResults: "Máx. resultados:",
        resultsSection: "Resultados de Búsqueda",
        selectAll: "☑️ Seleccionar Todos",
        deselectAll: "⬜ Deseleccionar Todos",
        selected: "seleccionados",
        loadMore: "Cargar Más Resultados",
        downloadOptions: "Opciones de Descarga",
        content: "Contenido",
        includeAttachments: "Incluir Archivos Adjuntos",
        includeBody: "Incluir Cuerpo del Correo",
        includeHeaders: "Incluir Encabezados",
        exportFormat: "Formato de Exportación",
        zipFormat: "📦 ZIP (Correos + Archivos Adjuntos)",
        csvFormat: "📊 CSV (Solo Metadatos)",
        bothFormat: "📦+📊 Ambos",
        sizeEstimate: "Estimación de tamaño:",
        calculating: "Calculando...",
        startDownload: "⬇️ Iniciar Descarga",
        cancelSelection: "❌ Cancelar Selección",
        progressTitle: "📊 Progreso de Descarga",
        totalProgress: "Progreso Total",
        downloaded: "Descargados",
        attachments: "Archivos Adjuntos",
        size: "Tamaño",
        timeRemaining: "Tiempo Restante",
        downloading: "Descargando...",
        pause: "⏸️ Pausar",
        resume: "▶️ Reanudar",
        cancel: "⏹️ Cancelar",
        completed: "¡Descarga Completada!",
        saveExport: "💾 Guardar Exportación",
        newSearch: "🔍 Nueva Búsqueda"
    },
    
    // Batch Sender
    sender: {
        title: "📤 Envío Masivo de Correos",
        subtitle: "Sube un CSV con destinatario, asunto y contenido para enviar correos en masa",
        uploadSection: "Subir Archivo CSV",
        clickSelect: "Haz clic para seleccionar",
        dragFile: "o arrastra el archivo CSV aquí",
        csvColumns: "El CSV debe contener las columnas: destinatario, asunto, contenido",
        emailsToSend: "correos para enviar",
        remove: "❌ Eliminar",
        csvFormat: "📋 Formato CSV Requerido:",
        previewSection: "Vista Previa y Validación",
        recipient: "Destinatario",
        subject: "Asunto",
        contentPreview: "Contenido (vista previa)",
        showing: "Mostrando los primeros 5 correos de",
        sendOptions: "Opciones de Envío",
        useDelay: "Usar retraso entre correos (recomendado)",
        delayDescription: "Retraso aleatorio entre 35-75 segundos para respetar los límites de Gmail",
        testMode: "Modo de Prueba (enviar solo los primeros 3 correos)",
        testDescription: "Útil para verificar que todo funciona correctamente",
        gmailLimits: "Límites de Gmail",
        freeAccount: "Cuenta gratuita: 500 correos/día",
        workspace: "Google Workspace: 2000 correos/día",
        estimatedTime: "Tiempo estimado: ~1 minuto por correo con retraso",
        startSending: "🚀 Iniciar Envío",
        progressTitle: "📊 Progreso de Envío",
        totalProgress: "Progreso Total",
        sent: "Enviados",
        failed: "Fallidos",
        remaining: "Restantes",
        sendingTo: "Enviando a:",
        timeRemaining: "Tiempo restante estimado:",
        pause: "⏸️ Pausar",
        resume: "▶️ Reanudar",
        stop: "⏹️ Detener",
        completed: "¡Envío Completado!",
        exportResults: "📊 Exportar Resultados",
        newBatch: "📤 Nuevo Lote"
    },
    
    // Footer
    footer: {
        privacyPolicy: "Política de Privacidad",
        termsOfService: "Términos de Servicio",
        about: "Acerca de 42ROWS",
        openSource: "Open Source",
        copyright: "© 2024 42ROWS Srl - CIF: IT18017981004"
    },
    
    // Common
    common: {
        loading: "Cargando...",
        error: "Error",
        success: "Éxito",
        cancel: "Cancelar",
        confirm: "Confirmar",
        close: "Cerrar",
        save: "Guardar",
        delete: "Eliminar",
        upload: "Subir",
        download: "Descargar",
        export: "Exportar",
        import: "Importar"
    },
    
    // Errors
    errors: {
        authFailed: "Autenticación fallida. Por favor, inténtalo de nuevo.",
        quotaExceeded: "Cuota de Gmail excedida. Por favor, inténtalo mañana.",
        networkError: "Error de conexión. Verifica tu conexión a internet.",
        invalidCSV: "Archivo CSV no válido. Por favor, verifica el formato.",
        noRecipients: "No se encontraron destinatarios en el CSV.",
        tokenExpired: "Sesión expirada. Por favor, inicia sesión nuevamente.",
        batchTooLarge: "Demasiados correos. Máximo permitido: 10.000.",
        memoryWarning: "Memoria baja. Algunas funciones podrían estar limitadas.",
        clientIdMissing: "Client ID faltante. Por favor, configura la aplicación."
    },
    
    // Success Messages
    success: {
        authSuccess: "¡Inicio de sesión exitoso!",
        batchComplete: "¡Envío masivo completado!",
        downloadComplete: "¡Descarga completada!",
        exportComplete: "¡Exportación completada!",
        settingsSaved: "¡Configuración guardada!"
    }
};
