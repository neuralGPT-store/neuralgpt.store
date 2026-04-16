# Editorial Review Checklist (Internal)

## Scope
- This checklist applies only to the internal editorial layer.
- It does not change public routes, legacy canonicals, or sitemap strategy.
- Inputs reviewed: `data/risk-report.json` and `reports/risk-report-summary.md`.

## Outcome Checklist

### `allow`
- Que revisar: calidad minima del anuncio, consistencia de campos clave y ausencia de alertas criticas.
- Evidencias: score total bajo, sin `critical_signal_count`, sin peers fuertes.
- Cuando permitir: datos completos y senales menores sin patron de abuso.
- Cuando monitorizar: si repite senales leves (`missing_contact_identity`) en nuevas publicaciones.
- Cuando pasar a revision: si aparece nueva senal de fraude o salto de score entre cortes.
- Cuando cuarentenar: no aplica salvo evidencia externa grave.
- Cuando proponer suspension: no aplica.

### `allow_with_monitoring`
- Que revisar: tendencia temporal del anunciante y estabilidad de precio/descripcion.
- Evidencias: flags leves acumulados, score medio sin umbral de bloqueo.
- Cuando permitir: primera incidencia aislada y trazabilidad limpia.
- Cuando monitorizar: siempre, con ventana rolling de 7-30 dias.
- Cuando pasar a revision: segunda incidencia similar o incremento material de score.
- Cuando cuarentenar: combinacion de alertas de duplicado + fraude aunque no criticas.
- Cuando proponer suspension: solo si escala a patron reiterado.

### `pending_review`
- Que revisar: evidencia cruzada de duplicado/fraude y contexto comercial del anuncio.
- Evidencias: top peer fuerte, codigos de abuso, variaciones sospechosas en re-subida.
- Cuando permitir: si hay justificacion documental valida y datos verificables.
- Cuando monitorizar: cuando se rehabilita tras correccion del anunciante.
- Cuando pasar a revision: estado base, requiere decision humana.
- Cuando cuarentenar: si faltan pruebas minimas o hay contradicciones clave.
- Cuando proponer suspension: si se confirma intencionalidad de abuso.

### `quarantine`
- Que revisar: legitimidad del anunciante y consistencia tecnica del activo.
- Evidencias: señales fuertes acumuladas, identidad no verificada, patron repetitivo.
- Cuando permitir: solo tras correccion completa y nueva validacion.
- Cuando monitorizar: en periodo de probation posterior a rehabilitacion.
- Cuando pasar a revision: siempre (doble validacion editorial).
- Cuando cuarentenar: estado por defecto ante evidencia incompleta o conflictiva.
- Cuando proponer suspension: si hay reincidencia o fraude confirmado.

### `suspend_candidate`
- Que revisar: alcance del dano potencial y recurrencia del actor.
- Evidencias: critical signals, abuso sistematico, historial negativo.
- Cuando permitir: excepcional, con evidencia fuerte de falso positivo.
- Cuando monitorizar: solo si se revierte a estado inferior por decision senior.
- Cuando pasar a revision: inmediata, con prioridad P0.
- Cuando cuarentenar: transicion temporal si falta ultima validacion legal/editorial.
- Cuando proponer suspension: por defecto, con registro de motivos y auditoria.

## Signal-Specific Checklist

### `title_similarity`
- Que revisar: proximidad semantica y estructura textual repetida.
- Evidencias: porcentaje de similitud, pares historicos, timestamp de publicacion.
- Permitir: coincidencia generica esperable sin overlap estructural fuerte.
- Monitorizar: similitud media sostenida en el mismo actor.
- Revision/Cuarentena/Suspension: segun combinacion con `description_similarity` y `resubmission_pattern`.

### `description_similarity`
- Que revisar: bloques de texto reciclados y cambios cosmeticos minimos.
- Evidencias: ratio de similitud y fragmentos replicados.
- Permitir: plantillas comerciales basicas sin calco masivo.
- Monitorizar: repeticion moderada en un mismo portfolio.
- Revision/Cuarentena/Suspension: cuando hay replica sistematica para manipular visibilidad.

### `location_overlap`
- Que revisar: equivalencia de direccion, zona, coordenadas o barrio.
- Evidencias: normalizacion de campos location y coincidencia entre listings.
- Permitir: activos distintos en mismo edificio con pruebas claras.
- Monitorizar: multiples anuncios del mismo anunciante en misma microzona.
- Revision/Cuarentena/Suspension: si se detecta clonacion de ubicacion para spam.

### `suspicious_price`
- Que revisar: desvio vs mercado, precio exacto repetido, saltos no justificados.
- Evidencias: price_per_m2, mediana local, historial del activo.
- Permitir: activos singulares con justificativo comercial.
- Monitorizar: outliers moderados recurrentes.
- Revision/Cuarentena/Suspension: outlier extremo combinado con identidad debil.

### `repeated_contact`
- Que revisar: reutilizacion de telefono/email entre multiples cuentas o listings.
- Evidencias: hashes de contacto, frecuencia temporal, red de cuentas.
- Permitir: grupos corporativos declarados y verificables.
- Monitorizar: reutilizacion parcial sin otras alertas.
- Revision/Cuarentena/Suspension: malla de cuentas para eludir limites.

### `resubmission_abuse`
- Que revisar: altas/bajas repetidas para refrescar posicion.
- Evidencias: historial de estados, ventanas de tiempo cortas, mismo payload.
- Permitir: baja tecnica justificada y reactivacion controlada.
- Monitorizar: primer patron incipiente.
- Revision/Cuarentena/Suspension: reiteracion deliberada.

### `automation_abuse`
- Que revisar: ritmos no humanos, bursts por IP/dispositivo, secuencias mecanicas.
- Evidencias: creations_per_hour_per_ip, accounts_per_device_24h, trazas cronologicas.
- Permitir: picos operativos puntuales documentados.
- Monitorizar: actividad alta sin dano visible.
- Revision/Cuarentena/Suspension: automatizacion orientada a saturacion o scraping.

### `free_tier_abuse`
- Que revisar: uso del free tier para volumen no organico.
- Evidencias: active_free_listings, new_free_listings_30d, ratio alta/baja.
- Permitir: uso dentro de limites definidos.
- Monitorizar: aproximacion sostenida al umbral.
- Revision/Cuarentena/Suspension: superacion reiterada y evasiva.

### `value_anomaly`
- Que revisar: incoherencias fuertes entre atributos y valor declarado.
- Evidencias: comparables internos y consistencia de metadatos.
- Permitir: tipologias premium justificadas con evidencia.
- Monitorizar: desviaciones moderadas.
- Revision/Cuarentena/Suspension: anomalia severa con otras banderas de fraude.

### `missing_contact_identity`
- Que revisar: ausencia de identificadores verificables del anunciante.
- Evidencias: telefono/email/fingerprint disponible y calidad de identidad.
- Permitir: piloto controlado con score bajo y sin otras alertas.
- Monitorizar: repeticion persistente por actor.
- Revision/Cuarentena/Suspension: combinado con duplicados o abuso operativo.

## Operative Notes
- Registrar siempre decision humana cuando outcome final difiera del recomendado por motor.
- Mantener trazabilidad de evidencias para auditoria posterior.
- Ejecutar checklist en cada lote y antes de cualquier escalado geo adicional.
