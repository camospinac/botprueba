const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot')
require("dotenv").config
const QRPortalWeb = require('@bot-whatsapp/portal')
const { Client } = require('pg');
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')
const { delay } = require('@whiskeysockets/baileys')
const path = require("path")
const fs = require("fs")
const menuPath = path.join(__dirname, "mensajes", "menu.txt")
const menu = fs.readFileSync(menuPath, "utf-8")
const client = new Client({
    host: 'localhost', //process.env.PG_HOST,
    user: 'postgres',//process.env.PG_USER,
    password: 'postgres',//process.env.PG_PASSWORD,
    database: 'prueba',//process.env.PG_DATABASE,
    port: '5432' //process.env.PG_PORT
});

client.connect();
const menuPdfPath = path.join(__dirname, 'menu.png');
const flowMenu = addKeyword([EVENTS.ACTION])
    .addAnswer('Este es nuestro menu de platos: ', {
        media: menuPdfPath
    })

    const flowNombreCliente = addKeyword([EVENTS.ACTION])
    .addAnswer('Por favor, indícanos tu nombre:', { capture: true }, async (ctx, { flowDynamic, gotoFlow }) => {
        const nombreCliente = ctx.body.trim();
        ctx.session = { nombreCliente, productos: [], total: 0 };
        return gotoFlow(flowSeleccionPlato);
    });

//     const flowSeleccionPlato = addKeyword([EVENTS.ACTION])
//     .addAnswer('Por favor, selecciona el número del plato que deseas ordenar:', { capture: true }, async (ctx, { flowDynamic, gotoFlow }) => {
//         if (!ctx.session) ctx.session = {}; 
//         if (!Array.isArray(ctx.session.productos)) { 
//             ctx.session.productos = [];  // Solo inicializamos si no existe el array
//         }
//         if (typeof ctx.session.total !== 'number') {
//             ctx.session.total = 0;  // Inicializamos el total solo si no existe
//         }

//         const platoId = ctx.body.trim();
//         try {
//             const platoRes = await client.query('SELECT nombre, precio FROM menu WHERE id = $1', [platoId]);
//             if (platoRes.rows.length === 0) {
//                 return await flowDynamic('Plato no encontrado. Por favor selecciona un plato válido.');
//             }

//             const plato = platoRes.rows[0];
//             const precioU = parseFloat(plato.precio);
//             if (!isNaN(precioU)) {
//                 // Añadimos el nuevo producto al array de productos de la sesión
//                 ctx.session.productos.push({ nombre: plato.nombre, precio: precioU });  
//                 // Actualizamos el total en la sesión
//                 ctx.session.total += precioU;  
//             } else {
//                 console.error("Precio no válido:", plato.precio);
//             }

//             // Mostrar resumen actualizado al usuario
//             let resumen = "Tu orden hasta ahora es:\n";
//             ctx.session.productos.forEach((producto, index) => {
//                 resumen += `${index + 1}. ${producto.nombre} - $${producto.precio}\n`;
//             });
//             resumen += `\nTotal: $${ctx.session.total}`;
//             await flowDynamic(resumen);

//             return gotoFlow(flowAgregarOtro);  // Continuar al flujo de agregar otro producto
//         } catch (err) {
//             console.error('Error al procesar el pedido:', err);
//             await flowDynamic('Lo siento, ocurrió un error al procesar tu pedido.');
//         }
//     });


//     const flowAgregarOtro = addKeyword([EVENTS.ACTION])
//     .addAnswer('¿Quieres agregar otro producto? (Responde "si" o "no")', { capture: true }, async (ctx, { flowDynamic, gotoFlow }) => {
//         const respuesta = ctx.body.toLowerCase().trim();
//         if (respuesta === 'si') {
//             return gotoFlow(flowPedido);  // Volver al flujo de pedido para agregar más platos
//         } else if (respuesta === 'no') {
//             try {
//                 const { nombreCliente, productos, total } = ctx.session;  // Accedemos a los datos de la sesión
//                 const pedidoRes = await client.query(
//                     'INSERT INTO PEDIDOS_1 (nombre_cliente, estado, fecha, metodo_pago, monto_total) VALUES ($1, $2, NOW(), $3, $4) RETURNING id',
//                     [nombreCliente, 'Pendiente', 'Efectivo', total]
//                 );
//                 const numeroOrden = pedidoRes.rows[0].id;

//                 for (const producto of productos) {
//                     await client.query('INSERT INTO PEDIDOS_2 (id_pedido, producto, precio) VALUES ($1, $2, $3)', [
//                         numeroOrden, producto.nombre, producto.precio
//                     ]);
//                 }

//                 await flowDynamic(`🛒 Orden agendada correctamente. Tu número de orden es: ${numeroOrden}. Muchas gracias, ${nombreCliente}, te esperamos pronto 🍔🍔`);

//                 // Limpiar sesión al final del pedido
//                 ctx.session = {};
//             } catch (err) {
//                 console.error('Error al finalizar el pedido:', err);
//                 await flowDynamic('Lo siento, ocurrió un error al finalizar tu pedido.');
//             }
//         } else {
//             await flowDynamic('Respuesta no válida. Por favor, responde "si" o "no".');
//         }
//     });


// const flowPedido = addKeyword([EVENTS.ACTION])
//     .addAnswer('Estos son los platos disponibles:', {}, async (ctx, { flowDynamic, gotoFlow }) => {
//         try {
//             const res = await client.query('SELECT id, nombre, precio FROM MENU');
//             const platos = res.rows.map(plato => `${plato.id}. ${plato.nombre} - $${plato.precio}`).join('\n');
//             await flowDynamic(`Aquí tienes nuestro menú:\n\n${platos}`);
//             return gotoFlow(flowSeleccionPlato);
//         } catch (err) {
//             console.error('Error al consultar la base de datos:', err);
//             await flowDynamic('Lo siento, no se pudo cargar el menú en este momento.');
//         }
//     });

const flowSeleccionPlato = addKeyword([EVENTS.ACTION])
    .addAnswer('Estos son los platos disponibles:', {}, async (ctx, { flowDynamic }) => {
        // Mostrar menú de platos
        try {
            const res = await client.query('SELECT id, nombre, precio FROM MENU');
            const platos = res.rows.map(plato => `${plato.id}. ${plato.nombre} - $${plato.precio}`).join('\n');
            await flowDynamic(`Aquí tienes nuestro menú:\n\n${platos}\n\nSelecciona el número del plato que deseas ordenar:`);
        } catch (err) {
            console.error('Error al consultar la base de datos:', err);
            await flowDynamic('Lo siento, no se pudo cargar el menú en este momento.');
        }
    })
    .addAnswer('', { capture: true }, async (ctx, { flowDynamic }) => {
        // Inicializar sesión si no existe
        if (!ctx.session) ctx.session = {};
        if (!Array.isArray(ctx.session.productos)) {
            ctx.session.productos = [];
        }
        if (typeof ctx.session.total !== 'number') {
            ctx.session.total = 0;
        }

        const platoId = ctx.body.trim();
        try {
            const platoRes = await client.query('SELECT nombre, precio FROM menu WHERE id = $1', [platoId]);
            if (platoRes.rows.length === 0) {
                return await flowDynamic('Plato no encontrado. Por favor selecciona un plato válido.');
            }

            const plato = platoRes.rows[0];
            const precioU = parseFloat(plato.precio);
            if (!isNaN(precioU)) {
                // Añadir el plato a la lista de productos de la sesión
                ctx.session.productos.push({ nombre: plato.nombre, precio: precioU });
                // Sumar el precio al total
                ctx.session.total += precioU;
            } else {
                console.error("Precio no válido:", plato.precio);
            }

            // Mostrar resumen actualizado
            let resumen = "Tu orden hasta ahora es:\n";
            ctx.session.productos.forEach((producto, index) => {
                resumen += `${index + 1}. ${producto.nombre} - $${producto.precio}\n`;
            });
            resumen += `\nTotal: $${ctx.session.total}`;
            await flowDynamic(resumen);

            // Preguntar si desea agregar otro producto
            await flowDynamic('¿Quieres agregar otro producto? (Responde "si" o "no")');
        } catch (err) {
            console.error('Error al procesar el pedido:', err);
            await flowDynamic('Lo siento, ocurrió un error al procesar tu pedido.');
        }
    })
    .addAnswer('', { capture: true }, async (ctx, { flowDynamic, gotoFlow }) => {
        // Lógica para manejar la respuesta de agregar otro producto
        const respuesta = ctx.body.toLowerCase().trim();
        if (respuesta === 'si') {
            // Volvemos al inicio del flujo para seleccionar otro plato
            return await flowDynamic('Por favor, selecciona el número del plato que deseas agregar:');
        } else if (respuesta === 'no') {
            // Finalizar el pedido
            try {
                const pedidoRes = await client.query(
                    'INSERT INTO PEDIDOS_1 (nombre_cliente, estado, fecha, metodo_pago, monto_total) VALUES ($1, $2, NOW(), $3, $4) RETURNING id',
                    [ctx.session.nombreCliente, 'Pendiente', 'Efectivo', ctx.session.total]
                );
                const numeroOrden = pedidoRes.rows[0].id;
                for (const producto of ctx.session.productos) {
                    await client.query('INSERT INTO PEDIDOS_2 (id_pedido, producto, precio) VALUES ($1, $2, $3)', [
                        numeroOrden, producto.nombre, producto.precio
                    ]);
                }

                await flowDynamic(`🛒 Orden agendada correctamente, su número de orden es: ${numeroOrden}. Muchas gracias por comprar en Michael Burger, te esperamos pronto 🍔🍔`);
                // Reiniciar la sesión del usuario
                ctx.session.productos = [];
                ctx.session.total = 0;
                ctx.session.nombreCliente = '';
            } catch (err) {
                console.error('Error al finalizar el pedido:', err);
                await flowDynamic('Lo siento, ocurrió un error al finalizar tu pedido.');
            }
        } else {
            // Respuesta inválida
            await flowDynamic('Respuesta no válida. Por favor, responde "si" o "no".');
        }
    });


const flowConsultar = addKeyword([EVENTS.ACTION])
    .addAnswer('Por favor, escribe tu número de orden para validar el estado: ', { capture: true }, async (ctx, { flowDynamic }) => {
        const numOrder = ctx.body.trim();
        console.log(numOrder)
        try {
            const listOrden = await client.query('SELECT estado FROM PEDIDOS_1 WHERE id = $1', [numOrder]);
            if (listOrden.rows.length === 0) {
                await flowDynamic('Orden no encontrado. Te invitamos a ordenar nuestras deliciosas hamburguesas 🍔🍔');
            } else {
                const lista = listOrden.rows[0];
                estatus = lista.estado;
                await flowDynamic(`Tu pedido con número de orden ${numOrder} se encuentra con estado ${estatus}, muchas gracias por comprar en Michael Burger. 🍔🍔`);
            }
        } catch (err) {
            console.error('Error al consultar la base de datos:', err);
            await flowDynamic('Lo siento, no se pudo cargar la opción en este momento.');
        }
    });

    const menuFlow = addKeyword(['MENU', 'Menu', 'menu', 'Menú', 'menú', 'MENÚ']).addAnswer(
        menu,
        { capture: true },
        async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
            if (!["1", "2", "3", "0"].includes(ctx.body)) {
                // Si la respuesta no es válida, no debe caer aquí si está en otro flujo
                return fallBack(
                    "Respuesta no válida, por favor selecciona una de las opciones."
                );
            }
            switch (ctx.body) {
                case "1":
                    return gotoFlow(flowMenu);
                case "2":
                    return gotoFlow(flowNombreCliente);
                case "3":
                    return gotoFlow(flowConsultar);
                case "0":
                    return await flowDynamic("Saliendo... Puedes volver a acceder a este menú escribiendo *Menu*");
            }
        }
    );

const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([menuFlow, flowMenu, flowSeleccionPlato, flowConsultar, flowNombreCliente])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()
