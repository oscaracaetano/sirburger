const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

// El nombre compartido que configuramos en Windows es POS80
const shareName = process.argv[2] || 'POS80'

console.log('=============================================================')
console.log(`Enviando Ticket ESC/POS a recurso compartido: \\\\localhost\\${shareName}`)
console.log('=============================================================\n')

// Comandos ESC/POS estándar
const ESC = '\x1B'
const GS = '\x1D'

let ticket = ''
ticket += `${ESC}@`                      // Inicializar impresora térmica
ticket += `${ESC}a\x01`                  // Centrar texto
ticket += `${ESC}E\x01`                  // Negrita ON
ticket += `SIRBURGER\n`
ticket += `TEST DE COMANDERA\n`
ticket += `${ESC}E\x00`                  // Negrita OFF
ticket += `------------------------------------------------\n`
ticket += `${GS}!\x11`                   // Doble tamaño (ancho y alto)
ticket += `#A0001\n`
ticket += `${GS}!\x00`                   // Tamaño normal
ticket += `------------------------------------------------\n`
ticket += `${ESC}a\x00`                  // Alinear a la izquierda
ticket += `Fecha: ${new Date().toLocaleDateString('es-AR')}   Hora: ${new Date().toLocaleTimeString('es-AR')}\n`
ticket += `Impresora: Unnion UN-TP38UL\n`
ticket += `------------------------------------------------\n`
ticket += `1x Hamburguesa Clasica                 $ 4.500\n`
ticket += `   -> Sin cebolla\n`
ticket += `   -> Extra Cheddar x2\n`
ticket += `1x Papas Fritas Grandes               $ 2.500\n`
ticket += `1x Coca-Cola 500ml                    $ 1.500\n`
ticket += `------------------------------------------------\n`
ticket += `${ESC}a\x02`                  // Alinear derecha
ticket += `${ESC}E\x01TOTAL: $ 8.500\n${ESC}E\x00`
ticket += `${ESC}a\x01`                  // Centrar
ticket += `------------------------------------------------\n`
ticket += `SirBurger Cocina y Despacho\n\n\n\n\n\n`
ticket += `${GS}V\x41\x03`               // Corte automático total de papel

const tempFile = path.join(__dirname, 'test_ticket.bin')
fs.writeFileSync(tempFile, ticket, 'binary')

// Envío binario crudo directo al puerto compartido
const cmd = `cmd /c copy /b "${tempFile}" "\\\\localhost\\${shareName}"`

exec(cmd, (err, stdout, stderr) => {
  try {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
  } catch (_) {}

  if (err) {
    console.error('❌ Error al enviar a la impresora:', stderr || err.message)
  } else {
    console.log(stdout)
    console.log('✅ Ticket enviado al cabezal térmico con éxito.')
    console.log('📄 Comprueba que haya impreso el ticket de SirBurger y cortado el papel.')
  }
})
