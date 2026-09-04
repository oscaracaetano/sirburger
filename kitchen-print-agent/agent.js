/**
 * SirBurger - Micro-Agente Local de Impresión de Cocina
 * 
 * Corre en la estación fija de cocina (Windows).
 * Escucha la cola de impresión de SirBurger, reproduce alertas sonoras
 * y envía las comandas a la Zebra GC420t (ZPL) o a la tickeadora con guillotina (ESC/POS).
 */

const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const net = require('net')
const { exec, spawn } = require('child_process')

// 1. Cargar configuración local
const configPath = path.join(__dirname, 'config.json')
let localConfig = {
  serverUrl: 'http://localhost:3000',
  pollIntervalMs: 3000,
  defaultPrinterName: 'Zebra GC420t',
}

if (fs.existsSync(configPath)) {
  try {
    const raw = fs.readFileSync(configPath, 'utf8')
    localConfig = { ...localConfig, ...JSON.parse(raw) }
  } catch (err) {
    console.error('⚠️ Error al leer config.json, usando valores por defecto:', err.message)
  }
}

console.log('═══════════════════════════════════════════════════════════════')
console.log('🍔  SIRBURGER - AGENTE DE IMPRESIÓN Y ALERTAS DE COCINA  🖨️')
console.log('═══════════════════════════════════════════════════════════════')
console.log(`🌐 Servidor: ${localConfig.serverUrl}`)
console.log(`⏱️  Intervalo de sondeo: ${localConfig.pollIntervalMs} ms`)
console.log('🚀 Iniciando escucha de pedidos para cocina...')
console.log('───────────────────────────────────────────────────────────────\n')

// 2. Función para reproducir sonidos por los parlantes de la PC
function playSoundAlert(isPriority = false) {
  try {
    let script = ''
    if (isPriority) {
      // Tono de alarma doble urgente para pedidos prioritarios
      script = `
        [console]::beep(1300, 160);
        Start-Sleep -Milliseconds 80;
        [console]::beep(800, 160);
        Start-Sleep -Milliseconds 80;
        [console]::beep(1300, 200);
        Start-Sleep -Milliseconds 80;
        [console]::beep(800, 200);
        Start-Sleep -Milliseconds 80;
        [console]::beep(1500, 450);
      `
    } else {
      // Campanada agradable para nuevos pedidos
      script = `
        [console]::beep(784, 180);
        Start-Sleep -Milliseconds 60;
        [console]::beep(1046, 260);
      `
    }

    exec(`powershell -NoProfile -NonInteractive -Command "${script.replace(/\n/g, ' ')}"`, (err) => {
      if (err) {
        // En caso de que no haya audio activo, continuamos sin bloquear
      }
    })
  } catch (err) {
    // Ignorar si el audio falla
  }
}

// 3. Envío RAW a impresora por Windows Spooler / USB
function printToWindowsPrinter(printerName, rawPayload) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(__dirname, `ticket_${Date.now()}.prn`)
    fs.writeFileSync(tempFile, rawPayload, 'binary')

    // Script PowerShell para enviar bytes crudos directamente al spooler de la impresora
    const psScript = `
      $printer = "${printerName}";
      $file = "${tempFile.replace(/\\/g, '\\\\')}";
      if (Get-Printer -Name $printer -ErrorAction SilentlyContinue) {
        Copy-Item -Path $file -Destination "\\\\localhost\\$printer" -ErrorAction SilentlyContinue;
        if ($?) { exit 0 }
      }
      # Fallback: Enviar contenido vía spooler genérico
      Get-Content -Path $file -Raw -Encoding Byte | Out-Printer -Name $printer;
    `

    exec(
      `powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\n/g, ' ')}"`,
      (err, stdout, stderr) => {
        // Limpiar archivo temporal
        try {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
        } catch (_) {}

        if (err) {
          console.error(`⚠️ Advertencia al enviar a ${printerName}:`, stderr || err.message)
        }
        resolve() // Resolvemos de todos modos para no atascar la cola
      }
    )
  })
}

// 4. Envío RAW a impresora de Red / Wi-Fi (Socket TCP 9100)
function printToNetworkPrinter(host, port, rawPayload) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    socket.setTimeout(5000)

    socket.connect(port || 9100, host, () => {
      socket.write(Buffer.from(rawPayload, 'binary'), () => {
        socket.end()
        resolve()
      })
    })

    socket.on('error', (err) => {
      console.error(`❌ Error de conexión con impresora en ${host}:${port}:`, err.message)
      resolve() // No trabar la cola
    })

    socket.on('timeout', () => {
      console.error(`⏱️ Tiempo de espera agotado con impresora en ${host}:${port}`)
      socket.destroy()
      resolve()
    })
  })
}

// 5. Petición HTTP / HTTPS genérica
function makeRequest(urlStr, method = 'GET', postData = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr)
    const client = parsed.protocol === 'https:' ? https : http

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'User-Agent': 'SirBurger-KitchenAgent/1.0',
        'Content-Type': 'application/json',
      },
    }

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData)
    }

    const req = client.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve({ status: res.statusCode, data: json })
        } catch (e) {
          resolve({ status: res.statusCode, data })
        }
      })
    })

    req.on('error', (err) => reject(err))
    req.setTimeout(6000, () => {
      req.destroy(new Error('Timeout en petición'))
    })

    if (postData) {
      req.write(postData)
    }
    req.end()
  })
}

// 6. Ciclo principal de sondeo
let isPolling = false

async function pollPrintQueue() {
  if (isPolling) return
  isPolling = true

  try {
    const url = `${localConfig.serverUrl.replace(/\/$/, '')}/api/printer/pending`
    const res = await makeRequest(url, 'GET')

    if (res.status === 200 && res.data && Array.isArray(res.data.jobs)) {
      const jobs = res.data.jobs

      for (const job of jobs) {
        const timeStr = new Date().toLocaleTimeString('es-AR')

        if (job.isTest) {
          console.log(`[${timeStr}] ⚡ PROCESANDO TICKET DE PRUEBA (#${job.code})`)
        } else if (job.isPriority) {
          console.log(`[${timeStr}] 🚨 PEDIDO PRIORITARIO RECIBIDO: #${job.code}`)
        } else {
          console.log(`[${timeStr}] 📥 NUEVO PEDIDO PARA COCINA: #${job.code}`)
        }

        // 1. Reproducir sonido en parlantes
        if (job.soundAlert) {
          playSoundAlert(job.isPriority)
        }

        // 2. Enviar a la impresora
        if (job.connectionType === 'NETWORK_TCP' && job.tcpHost) {
          await printToNetworkPrinter(job.tcpHost, job.tcpPort, job.rawPayload)
          console.log(`   🖨️  Ticket emitido por Red a ${job.tcpHost}:${job.tcpPort}`)
        } else {
          const printerName = job.printerName || localConfig.defaultPrinterName
          await printToWindowsPrinter(printerName, job.rawPayload)
          console.log(`   🖨️  Ticket emitido en cola de Windows: "${printerName}" [${job.driver}]`)
        }

        // 3. Confirmar impresión (ACK) al servidor
        const ackUrl = `${localConfig.serverUrl.replace(/\/$/, '')}/api/printer/ack`
        await makeRequest(
          ackUrl,
          'POST',
          JSON.stringify({
            orderId: job.orderId,
            isTest: job.isTest,
          })
        )
        console.log(`   ✅ Impresión confirmada al servidor (#${job.code})\n`)
      }
    }
  } catch (err) {
    // Si el servidor está apagado o reiniciando, mostramos aviso silencioso
    if (err.code === 'ECONNREFUSED' || err.message?.includes('Timeout')) {
      // Servidor temporalmente no disponible, reintentará en el próximo ciclo
    } else {
      console.error('⚠️ Error al consultar cola:', err.message)
    }
  } finally {
    isPolling = false
  }
}

// Iniciar sondeo continuo
setInterval(pollPrintQueue, localConfig.pollIntervalMs)
pollPrintQueue()
