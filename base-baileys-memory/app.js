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

const flowMenu = addKeyword([EVENTS.ACTION])
    .addAnswer('Hola buen día')
    .addAnswer('Este es nuestro menu de platos: ', {
        media: "./menu.pdf"
    })

const flowPedido = addKeyword([EVENTS.ACTION])
    .addAnswer('Estos son los platos disponibles:', {}, async (ctx, { flowDynamic }) => {
        try {
            const res = await client.query('SELECT nombre, precio FROM MENU');
            const platos = res.rows.map(plato => `${plato.nombre} - $${plato.precio}`).join('\n');
            await flowDynamic(`Aquí tienes nuestro menú:\n\n${platos}`);
        } catch (err) {
            console.error('Error al consultar la base de datos:', err);
            await flowDynamic('Lo siento, no se pudo cargar el menú en este momento.');
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
            case "0":
                return await flowDynamic("Saliendo... Puedes volver a acceder a este menú escribiendo *Menu*");
        }
    }
);

const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([menuFlow, flowMenu, flowPedido])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()
