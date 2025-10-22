// Espera a que toda la página HTML esté cargada
document.addEventListener('DOMContentLoaded', () => {

    const container = document.getElementById('dashboard-container');
    const estadoGeneral = document.getElementById('conexion-general');
    let todosConectados = true; // Variable para el estado general

    // 1. Cargar la configuración
    fetch('config.json')
        .then(response => response.json())
        .then(config => {
            // 2. Por cada dispositivo en el config, crear una tarjeta
            config.dispositivos.forEach(device => {
                crearTarjetaDispositivo(device);
            });
        })
        .catch(error => {
            console.error('¡Error al cargar config.json!', error);
            container.innerHTML = '<h2>Error al cargar configuración. Revisa el archivo `config.json` y que estés en un servidor local.</h2>';
            estadoGeneral.className = 'error';
        });

    /**
     * Crea la tarjeta HTML y lanza la conexión WebSocket para un dispositivo
     */
    function crearTarjetaDispositivo(device) {
        // Crear el elemento HTML de la tarjeta
        const card = document.createElement('div');
        card.className = 'device-card';
        card.id = device.id; // Asignamos el ID único

        // Crear el contenido base (título y estado)
        card.innerHTML = `
            <h3>${device.nombre}</h3>
            <div id="${device.id}-contenido">
                <p class="status conectando">Conectando...</p>
            </div>
        `;

        // 3. Añadir la tarjeta al 'container'
        container.appendChild(card);

        // 4. Iniciar la conexión WebSocket para este dispositivo
        conectarWebSocket(device, card);
    }

    /**
     * Maneja la conexión WebSocket de un solo dispositivo
     */
    function conectarWebSocket(device, card) {
        const contenido = document.getElementById(`${device.id}-contenido`);
        let ws;

        function conectar() {
            try {
                ws = new WebSocket(https://paginadomotica-github-io-25858.onrender.com);

                // --- MANEJADORES DE EVENTOS DEL WEBSOCKET ---

                // A. Cuando se abre la conexión
                ws.onopen = () => {
                    console.log(`Conectado a: ${device.nombre}`);
                    // Actualizamos solo el estado de esta tarjeta
                    if (device.tipo === 'switch') {
                        renderizarSwitch(device, contenido, ws, true); // Mostrar botones
                    } else {
                        contenido.innerHTML = '<p class="status conectado">Conectado</p>';
                    }
                    actualizarEstadoGeneral();
                };

                // B. Cuando se recibe un mensaje
                ws.onmessage = (event) => {
                    console.log(`Mensaje de ${device.nombre}: ${event.data}`);
                    // Renderizar el mensaje según el TIPO de dispositivo
                    renderizarMensaje(device, contenido, event.data);
                };

                // C. Cuando se cierra la conexión
                ws.onclose = () => {
                    console.log(`Desconectado de: ${device.nombre}`);
                    contenido.innerHTML = '<p class="status desconectado">Desconectado. Reconectando...</p>';
                    todosConectados = false;
                    actualizarEstadoGeneral();
                    
                    // **MEJORA: Reconexión Automática**
                    // Intentar reconectar después de 3 segundos
                    setTimeout(conectar, 3000);
                };

                // D. Cuando ocurre un error
                ws.onerror = (error) => {
                    console.error(`Error en WebSocket ${device.nombre}:`, error);
                    contenido.innerHTML = '<p class="status desconectado">Error de conexión</p>';
                    ws.close(); // Cerramos para disparar el 'onclose' y reconectar
                };

            } catch (error) {
                console.error('Error al intentar conectar:', error);
                contenido.innerHTML = '<p class="status desconectado">URL de WS inválida</p>';
                todosConectados = false;
                actualizarEstadoGeneral();
            }
        }

        conectar(); // Iniciar la primera conexión
    }

    /**
     * Dibuja el contenido de la tarjeta según el mensaje recibido
     */
    function renderizarMensaje(device, contenido, data) {
        // Aquí puedes personalizar cómo se ve cada tipo de dispositivo
        switch (device.tipo) {
            case 'sensor_texto':
                contenido.innerHTML = `<p class="status">${data}</p>`;
                break;
            case 'sensor_valor':
                contenido.innerHTML = `<p class="status">${data} ${device.unidad || ''}</p>`;
                break;
            case 'switch':
                // Para un switch, asumimos que el mensaje es su estado actual (ej. "ON" o "OFF")
                // Mantenemos los botones, solo actualizamos un texto de estado
                const statusP = contenido.querySelector('.switch-status');
                if (statusP) {
                    statusP.textContent = `Estado: ${data}`;
                }
                break;
            default:
                contenido.innerHTML = `<p class="status">${data}</p>`;
        }
    }

    /**
     * Dibuja los botones para un dispositivo de tipo 'switch'
     */
    function renderizarSwitch(device, contenido, ws, conectado) {
        if (!conectado) {
            contenido.innerHTML = '<p class="status desconectado">Desconectado</p>';
            return;
        }

        contenido.innerHTML = `
            <div class="switch-controls">
                <button class="btn-on">ON</button>
                <button class="btn-off">OFF</button>
            </div>
            <p class="switch-status">Estado: Desconocido</p>
        `;

        // Añadir lógica a los botones
        contenido.querySelector('.btn-on').addEventListener('click', () => {
            console.log(`Enviando ${device.comando_on} a ${device.nombre}`);
            ws.send(device.comando_on);
        });

        contenido.querySelector('.btn-off').addEventListener('click', () => {
            console.log(`Enviando ${device.comando_off} a ${device.nombre}`);
            ws.send(device.comando_off);
        });
    }

    /**
     * Actualiza el círculo de estado general en el H1
     */
    function actualizarEstadoGeneral() {
        // Esta es una lógica simple. Si CUALQUIER dispositivo falla, se pone en error.
        if (todosConectados) {
            estadoGeneral.className = 'conectado';
            estadoGeneral.title = 'Todos los dispositivos conectados';
        } else {
            estadoGeneral.className = 'error';
            estadoGeneral.title = 'Al menos un dispositivo está desconectado';
        }
        // Nota: 'todosConectados' se pone en 'false' en 'onclose' o 'onerror'.
        // Se necesitaría una lógica más compleja para saber si *todos* están ok.
    }

}); // Fin del 'DOMContentLoaded'