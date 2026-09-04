# SirBurger — Agente Local de Impresión de Cocina

Este agente corre en la **PC fija de la cocina**. Se encarga de:
1. Detectar automáticamente los pedidos enviados a cocina (`EN_PREPARACION`).
2. Reproducir avisos sonoros por los parlantes de la estación (campana para pedidos nuevos, sirena doble para pedidos `🚨 PRIORITARIO`).
3. Enviar el ticket formateado a la impresora térmica:
   - **Zebra GC420t (ZPL):** Comandos nativos vectoriales con código de barras Code 128 nítido.
   - **Comanderas ESC/POS (Unnion TP85 / TP95 / XL-SCAN):** Con comando de corte automático de guillotina.
4. Avisar al sistema que el ticket físico ya fue impreso (`printedAt = new Date()`).

---

## 🚀 Puesta en Marcha en 1 Clic (Windows)

1. Abrí el archivo `config.json` y colocá la URL de tu sistema (ej: `http://localhost:3000` o la URL de producción en Vercel `https://sirburger...`).
2. Hacé doble clic en **`iniciar-agente.bat`**.
3. ¡Listo! Quedará escuchando e imprimiendo de forma desatendida.

> **Tip:** Podés crear un acceso directo a `iniciar-agente.bat` en la carpeta `shell:startup` de Windows (presionando `Win + R` y escribiendo `shell:startup`) para que el agente arranque automáticamente solo cada vez que se prenda la PC de la cocina.

---

## ⚙️ Cambio de Impresora
No necesitás tocar nada en el código. Solo ingresás a:
**Panel Admin > Configuración > Impresora de Tickets** (`/admin/configuracion/impresora`)
y cambiás entre Zebra GC420t o Comandera 80mm ESC/POS con corte automático.
