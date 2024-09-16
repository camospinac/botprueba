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
    host: "localhost",//process.env.PG_HOST,
    user: "postgres",//process.env.PG_USER,
    password: "postgres",//process.env.PG_PASSWORD,
    database: "prueba",//process.env.PG_DATABASE,
    port: "5432",//process.env.PG_PORT
});

client.connect();

const menuPdfPath = path.join(__dirname, 'menu.png');
const flowMenu = addKeyword([EVENTS.ACTION])
    .addAnswer('Hola buen día')
    .addAnswer('Este es nuestro menu de platos: ', {
        media: menuPdfPath
    })


const flowSeleccionPlato = addKeyword([EVENTS.ACTION])
    .addAnswer('Por favor, selecciona el número del plato que deseas ordenar:', { capture: true }, async (ctx, { flowDynamic }) => {
        const platoId = ctx.body.trim();
        console.log(platoId)
        try {
            const platoRes = await client.query('SELECT nombre, precio FROM menu WHERE id = $1', [platoId]);
            if (platoRes.rows.length === 0) {
                return await flowDynamic('Plato no encontrado. Por favor selecciona un plato válido.');
            }
            const plato = platoRes.rows[0];
            const numeroOrden = Math.floor(Math.random() * 1000000);
            const estado = "Pendiente";
            await client.query('INSERT INTO PEDIDOS (ctvo, plato, precio, estado) VALUES ($1, $2, $3, $4)', [
                numeroOrden,
                plato.nombre,
                plato.precio,
                estado
            ]);
            await flowDynamic(`🛒 Orden agendada correctamente, su número de orden para consultar su estado es: ${numeroOrden}, muchas gracias por comprar en Michael Burger. 🍔🍔`);
        } catch (err) {
            console.error('Error al procesar el pedido:', err);
            await flowDynamic('Lo siento, ocurrió un error al procesar tu pedido.');
        }
    });

const flowPedido = addKeyword([EVENTS.ACTION])
    .addAnswer('Estos son los platos disponibles:', {}, async (ctx, { flowDynamic, gotoFlow }) => {
        try {
            const res = await client.query('SELECT id, nombre, precio FROM MENU');
            const platos = res.rows.map(plato => `${plato.id}. ${plato.nombre} - $${plato.precio}`).join('\n');
            await flowDynamic(`Aquí tienes nuestro menú:\n\n${platos}`);
            return gotoFlow(flowSeleccionPlato);
        } catch (err) {
            console.error('Error al consultar la base de datos:', err);
            await flowDynamic('Lo siento, no se pudo cargar el menú en este momento.');
        }
    });

const flowConsultar = addKeyword([EVENTS.ACTION])
    .addAnswer('Por favor, escribe tu número de orden para validar el estado: ', { capture: true }, async (ctx, { flowDynamic }) => {
        const numOrder = ctx.body.trim();
        console.log(numOrder)
        try {
            const listOrden = await client.query('SELECT estado FROM pedidos WHERE ctvo = $1', [numOrder]);
            if (listOrden.rows.length === 0) {
                await flowDynamic('Orden no encontrado. Te invitamos a ordenar nuestras deliciosas hamburguesas 🍔🍔');
            }else{
                const lista = listOrden.rows[0];
                estatus = lista.estado;
                await flowDynamic(`Tu pedido con número de orden ${numOrder} se encuentra con estado ${estatus}, muchas gracias por comprar en Michael Burger. 🍔🍔`);
            }
        } catch (err) {
            console.error('Error al consultar la base de datos:', err);
            await flowDynamic('Lo siento, no se pudo cargar la opción en este momento.');
        }
    });

const menuFlow = addKeyword([EVENTS.WELCOME]).addAnswer(
    menu,
    { capture: true },
    async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
        if (!["1", "2", "3", "0"].includes(ctx.body)) {
            return fallBack(
                "Respuesta no válida, por favor selecciona una de las opciones."
            );
        }
        switch (ctx.body) {
            case "1":
                return gotoFlow(flowMenu);
            case "2":
                return gotoFlow(flowPedido);
            case "3":
                return gotoFlow(flowConsultar);
            case "0":
                return await flowDynamic("Saliendo... Puedes volver a acceder a este menú escribiendo *Menu*");
        }
    }
);

const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([menuFlow, flowMenu, flowPedido, flowSeleccionPlato, flowConsultar])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()
