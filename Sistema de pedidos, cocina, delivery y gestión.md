# Sistema de pedidos, cocina, delivery y gestión

## 1. Objetivo general

El sistema tendrá como objetivo automatizar y simplificar el circuito completo de pedidos de un local de comidas con delivery: desde que el cliente realiza el pedido hasta su preparación, despacho y entrega.

La prioridad será **reducir al mínimo las tareas manuales del personal**. La información debe ingresar una sola vez y desplazarse automáticamente por las distintas etapas.

El sistema deberá permitir además obtener información operativa y estadística sobre ventas, tiempos de preparación, consumo de ingredientes, horarios de mayor actividad y distribución geográfica de los pedidos.

---

# 2. Sitio web para clientes

El cliente podrá ingresar al sitio sin crear una cuenta y sin iniciar sesión.

El sitio mostrará:

- Menú
- Categorías de productos
- Promociones
- Productos destacados
- Información del local
- Horarios de atención

El cliente podrá consultar el menú incluso fuera del horario de atención.

Sin embargo, **fuera de los horarios habilitados no podrá agregar productos al carrito ni realizar un pedido**.

Los días y horarios de atención serán configurables desde el panel administrativo.

---

# 3. Menú y productos

Cada producto tendrá:

- Nombre
- Fotografía
- Descripción
- Precio
- Ingredientes
- Opciones de personalización
- Opciones adicionales
- Reglas de cantidades, cuando corresponda

El cliente podrá agregar directamente un producto al carrito o ingresar a su detalle para personalizarlo.

---

# 4. Personalización del pedido

Cada producto podrá tener diferentes tipos de modificaciones.

Por ejemplo:

### Hamburguesa

Incluye:

- Pan
- Carne
- Cheddar
- Lechuga
- Tomate
- Salsa

El cliente podrá seleccionar:

- Sin lechuga
- Sin tomate
- Sin cheddar
- Extra cheddar
- Doble carne
- Triple carne
- Huevo
- Bacon
- Etc.

Los productos que admitan cantidades podrán utilizar controles de cantidad.

Por ejemplo:

**Papas**

`− 1 +`

o:

**Cheddar**

`− 2 +`

El precio deberá actualizarse inmediatamente al modificar el producto.

---

# 5. Carrito y revisión final

El carrito mostrará todos los productos seleccionados, sus cantidades, modificaciones y precios.

Antes de confirmar el pedido, el cliente tendrá una etapa específica de **revisión y personalización final**.

En esta pantalla podrá revisar y modificar cada producto sin tener que volver al menú.

El sistema mostrará el total actualizado.

**No se cobrará delivery**, por lo que no existirá un cargo adicional por envío.

---

# 6. Datos del cliente

Una vez que el pedido esté definido, se solicitarán los datos necesarios para realizar la entrega:

- Nombre
- Teléfono
- Dirección
- Referencia para llegar
- Otros datos que se consideren necesarios

No habrá facturación desde el sistema ni se generará factura electrónica.

El sistema podrá disponer de una base de datos de clientes.

Cuando un número de teléfono ya exista, los datos conocidos podrán ofrecerse automáticamente para facilitar nuevos pedidos.

Esta función deberá ser configurable desde administración.

---

# 7. Medio de pago

El pedido deberá registrar el medio de pago seleccionado.

Inicialmente podrán contemplarse, por ejemplo:

- Efectivo
- POS
- Transferencia

El sistema deberá permitir incorporar posteriormente otros métodos de pago.

El procesamiento de pagos online podrá incorporarse como módulo independiente en el futuro.

---

# 8. Confirmación del pedido

Al confirmar el pedido se generará un número único.

Por ejemplo:

**Pedido #A4837**

El cliente recibirá una confirmación similar a:

> Recibimos tu pedido.  
> Estamos procesándolo y te avisaremos cuando salga hacia tu domicilio.
>
> Recordá el número **#A4837**. Si necesitás comunicarte con nosotros para realizar un cambio fuera de tiempo, mencioná ese número.

El número de pedido será la referencia utilizada durante todo el proceso.

---

# 9. Panel de administración

Los pedidos ingresarán automáticamente al panel del local.

La operadora verá los pedidos en una cola ordenada cronológicamente.

El comportamiento normal será **FIFO (First In, First Out)**: los pedidos se procesan en el orden en que fueron recibidos.

Los pedidos nuevos irán apareciendo y los existentes se desplazarán dentro de la cola a medida que lleguen nuevos pedidos.

Cada pedido mostrará, entre otros datos:

- Número de pedido
- Hora de recepción
- Cliente
- Productos
- Modificaciones
- Total
- Medio de pago
- Estado
- Tiempo transcurrido

---

# 10. Estados del pedido

El pedido tendrá un flujo de estados.

Una secuencia posible será:

**RECIBIDO → APROBADO → EN PREPARACIÓN → LISTO → EN CALLE → ENTREGADO**

También podrán existir estados especiales:

**INTERVENCIÓN**

**CANCELADO**

La transición entre estados quedará registrada con fecha y hora.

---

# 11. Aprobación y envío a cocina

La operadora dispondrá de tres acciones principales:

### A COCINA

Envía el pedido directamente a preparación.

Al hacerlo:

- El pedido cambia de estado.
- Se registra la hora.
- Se imprime automáticamente el ticket de cocina.
- Comienza el seguimiento del tiempo de preparación.

### INTERVENIR

Permite detener el pedido antes de enviarlo a cocina para resolver algún inconveniente con el cliente.

### CANCELAR

Cancela el pedido y registra la cancelación.

---

# 12. Sistema de intervención

La intervención será siempre una decisión de la operadora.

El sistema **no contactará automáticamente al cliente**.

Al seleccionar **INTERVENIR**, el sistema analizará los productos del pedido y mostrará posibles problemas relacionados con sus ingredientes.

Por ejemplo, si el pedido contiene:

- Doble hamburguesa
- Pan de papa
- Cheddar
- Papas fritas

podrá mostrar:

**¿Cuál es el problema?**

- Cheddar
- Papas fritas
- Pan de papa
- Ninguno de los anteriores
- Otro

La selección permitirá generar automáticamente un mensaje apropiado para el cliente.

Por ejemplo, si se selecciona "Cheddar", el sistema prepara el mensaje correspondiente explicando que en ese momento no hay cheddar y ofreciendo las alternativas configuradas.

La operadora podrá completar o modificar el mensaje antes de enviarlo.

Un botón permitirá abrir **WhatsApp Web** con el mensaje preparado y el número del cliente.

La comunicación final con el cliente la realizará la operadora.

Una vez resuelto el problema, la operadora podrá:

- Modificar el pedido
- Mantenerlo
- Aplicar un descuento
- Aplicar una compensación/cupón
- Cancelarlo
- Enviarlo finalmente a cocina

El ticket que llegue a cocina deberá representar **la versión definitiva del pedido**.

---

# 13. Tiempos de preparación

Cada producto tendrá configurado un tiempo estimado de preparación.

Por ejemplo:

- Hamburguesa: 2 minutos
- Pizza: 4 minutos
- Papas: determinado tiempo
- Otros productos: tiempo correspondiente

Estos valores serán configurables desde administración.

El sistema utilizará esos tiempos para establecer referencias de preparación.

La estimación de un pedido podrá considerar los productos que lo componen y las reglas definidas para el cálculo.

---

# 14. Alertas de demora

Cada pedido mostrará visualmente su antigüedad mediante códigos de colores.

Los límites serán configurables.

Por ejemplo:

- Verde: dentro del tiempo esperado
- Amarillo: próximo al límite
- Naranja: demora significativa
- Rojo: tiempo excedido

Los colores no serán solamente decorativos: permitirán a la operadora detectar rápidamente qué pedidos requieren atención.

Si un pedido supera o se aproxima al tiempo máximo esperado, la operadora podrá comunicarse con cocina para consultar su estado.

Por ejemplo:

> "¿Qué pasa con el pedido #A4837? Ya está excedido del tiempo previsto."

---

# 15. Ticket de cocina

Al enviar un pedido a cocina se imprimirá automáticamente un ticket en una impresora térmica.

El ticket contendrá:

- Número de pedido
- Productos
- Cantidades
- Modificaciones
- Ingredientes eliminados
- Ingredientes adicionales
- Información relevante para preparación
- Hora del pedido
- Código único de identificación

El ticket tendrá un **código de barras** asociado exclusivamente a ese pedido.

---

# 16. Información del cliente en el ticket

El ticket que acompaña físicamente al pedido deberá contener también la información necesaria para el reparto, incluyendo:

- Nombre
- Dirección
- Teléfono
- Referencias
- Número de pedido
- Importe
- Medio de pago
- Cualquier otra información necesaria para la entrega

El ticket será colocado en la caja o paquete del pedido y lo acompañará durante todo el circuito.

---

# 17. Pedido terminado

Cuando el pedido esté preparado, su código de barras podrá ser escaneado.

El escaneo:

- Identifica el pedido.
- Lo marca como **LISTO**.
- Registra automáticamente la hora.

Este registro permitirá conocer con precisión cuánto tiempo demoró la cocina en preparar cada pedido.

Los tiempos podrán analizarse posteriormente según:

- Hora
- Día
- Tipo de producto
- Cantidad de productos
- Volumen de pedidos simultáneos
- Turno
- Etc.

---

# 18. Despacho a repartidores

Cada repartidor tendrá una tarjeta física identificatoria con código de barras.

Por ejemplo:

**REPARTIDOR 01 — JUAN**

Antes de comenzar una salida, el repartidor escaneará su tarjeta.

El sistema entrará en modo de despacho para ese repartidor.

A continuación se escanearán los pedidos que se lleva.

Cada escaneo:

- Identifica el pedido.
- Comprueba que esté disponible para despacho.
- Lo asigna al repartidor.
- Registra la hora.

La pantalla podrá mostrar en tiempo real los pedidos cargados:

> Juan  
> ✓ #A4837  
> ✓ #A4839  
> ✓ #A4841

Cuando termine de cargar los pedidos, el despacho podrá cerrarse mediante un segundo escaneo de la tarjeta o mediante un cierre automático por tiempo de espera.

---

# 19. Estado EN CALLE

Al cerrar el despacho, los pedidos asignados al repartidor pasarán a:

**EN CALLE**

El sistema enviará automáticamente una notificación al cliente.

Por ejemplo:

> **Pedido #A4837**
>
> Tu pedido ya está en la calle.
>
> El importe es **$1.420**.
>
> Tiempo estimado de llegada: aproximadamente 20–30 minutos.
>
> Te recomendamos estar atento para recibir al repartidor.

El sistema podrá utilizar posteriormente los tiempos históricos para mejorar las estimaciones.

---

# 20. Entrega

Al realizarse la entrega, el pedido podrá marcarse como **ENTREGADO**.

El método exacto para registrar la entrega podrá definirse posteriormente, por ejemplo mediante:

- Acción del repartidor
- Escaneo
- Confirmación desde el sistema
- O un mecanismo simplificado que se defina durante el desarrollo

---

# 21. Caja y cierre diario

Como todos los pedidos, medios de pago y repartidores quedan registrados automáticamente, el sistema podrá generar un resumen de caja al finalizar la jornada.

Ejemplo:

### Cierre del día

**Pedidos:** 137  
**Ventas:** $184.520

**Efectivo:** $73.400  
**POS:** $86.120  
**Transferencias:** $25.000

Y un resumen por repartidor:

| Repartidor | Pedidos | Importe |
|---|---:|---:|
| Juan | 24 | $45.000 |
| Pedro | 31 | $51.200 |
| Luis | 18 | $29.400 |

Los valores deberán poder conciliarse con los pedidos individuales.

---

# 22. Recetas e inventario teórico

Cada producto deberá tener asociada una receta técnica.

Por ejemplo:

### Hamburguesa Bacon

- 1 pan
- 1 medallón de carne
- 20 g de cheddar
- 15 g de bacon
- 10 g de lechuga
- 15 g de tomate
- 20 g de salsa

Las modificaciones realizadas por los clientes también deberán modificar el cálculo de consumo.

Por ejemplo:

**+ cheddar**

aumenta el consumo de cheddar.

**Sin tomate**

reduce el consumo de tomate.

**Doble carne**

duplica la cantidad correspondiente.

---

# 23. Consumo diario estimado

A partir de las ventas reales, el sistema podrá calcular el consumo teórico de ingredientes.

Ejemplo:

### Consumo estimado — 31/08

- Panes: 186
- Medallones: 143
- Muzzarella: 8,4 kg
- Cheddar: 2,8 kg
- Papas: 23,6 kg
- Bacon: 4,2 kg

Esto permitirá conocer rápidamente qué productos e ingredientes deben reponerse.

También podrá compararse el consumo teórico con el consumo real registrado manualmente para detectar diferencias, desperdicios o errores.

---

# 24. Productos agotados

Desde administración se podrá marcar rápidamente un ingrediente o producto como agotado.

Por ejemplo:

**Cheddar — AGOTADO**

El sitio deberá impedir que los clientes seleccionen opciones que no pueden ofrecerse.

Cuando el ingrediente vuelva a estar disponible podrá habilitarse nuevamente.

Esto deberá requerir la menor cantidad posible de acciones administrativas.

---

# 25. Estadísticas de ventas

El sistema conservará los datos históricos de los pedidos para generar estadísticas.

Podrán analizarse:

### Ventas

- Por día
- Por semana
- Por mes
- Por producto
- Por categoría
- Por promoción

### Horarios

- Cantidad de pedidos por hora
- Importe vendido por hora
- Tiempo promedio de preparación por hora

Esto permitirá detectar los momentos de mayor demanda.

---

# 26. Estadísticas de cocina

Los registros de cada etapa permitirán medir:

- Tiempo desde recepción hasta aprobación
- Tiempo hasta impresión
- Tiempo de preparación
- Tiempo hasta estar listo
- Tiempo hasta despacho
- Tiempo total del pedido

También podrán analizarse los tiempos en función de la cantidad y tipo de productos.

Esto permitirá detectar momentos en los que la cocina comienza a saturarse.

---

# 27. Estadísticas geográficas

Las direcciones de entrega podrán utilizarse, bajo las condiciones de privacidad que se definan, para generar estadísticas geográficas.

Por ejemplo:

- Cantidad de pedidos por zona
- Ventas por zona
- Horarios de mayor demanda por zona
- Distribución de clientes
- Concentración de pedidos

Podrá generarse un **mapa de calor** de la zona de reparto.

El mapa deberá utilizarse principalmente para estadísticas agregadas y no necesariamente para mostrar públicamente la ubicación exacta de clientes.

---

# 28. Promociones

Las promociones deberán poder configurarse desde administración.

Una promoción podrá definir:

- Productos incluidos
- Precio
- Días
- Horarios
- Fecha de inicio
- Fecha de finalización
- Condiciones

El sistema deberá encargarse automáticamente de aplicar las condiciones correspondientes al carrito.

---

# 29. Horarios de funcionamiento

Los horarios de funcionamiento serán configurables por día de la semana.

Por ejemplo:

| Día | Horario |
|---|---|
| Lunes | 19:00–00:00 |
| Martes | 19:00–00:00 |
| Miércoles | 19:00–00:00 |
| Jueves | 19:00–00:00 |
| Viernes | 19:00–01:00 |
| Sábado | 19:00–01:00 |
| Domingo | 19:00–00:00 |

Fuera de esos horarios:

- El menú continúa visible.
- Los productos pueden consultarse.
- No se pueden agregar productos al carrito.
- No se pueden realizar nuevos pedidos.

El sistema deberá mostrar claramente que el local está cerrado y cuándo volverá a aceptar pedidos.

---

# 30. Registro de actividad

Las acciones importantes deberán quedar registradas.

Por ejemplo:

> 21:43 — Pedido #A4837 recibido  
> 21:44 — A cocina  
> 21:44 — Ticket impreso  
> 21:57 — Pedido listo  
> 22:01 — Juan escaneó el pedido  
> 22:01 — Pedido en calle  
> 22:27 — Pedido entregado

Esto permitirá reconstruir el recorrido de cada pedido y analizar dónde se producen demoras.

---

# 31. Principio general de funcionamiento

El sistema deberá seguir una regla fundamental:

> **La información se introduce una sola vez y luego se reutiliza automáticamente en todas las etapas.**

El cliente introduce el pedido.

La operadora solamente lo revisa cuando es necesario.

La cocina recibe el ticket.

El pedido terminado se identifica mediante un escaneo.

El repartidor se identifica mediante un escaneo y escanea los pedidos que retira.

Caja, estadísticas, tiempos e inventario se alimentan automáticamente de esos mismos eventos.

El objetivo es que **cada persona haga únicamente las tareas que realmente requieren intervención humana**, eliminando escritura repetida, transcripción de pedidos, búsqueda manual de información y controles administrativos innecesarios.