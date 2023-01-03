const { Client, LocalAuth } = require("whatsapp-web.js");
require("dotenv").config();
const usuarios = [];
const Objeto = (id, client) => {
  return {
    id: id,
    client: client,
    estado: false,
    qr: false,
    nqr: 0,
    msg: null,
    off: false,
  };
};
const qrmax = process.env.QRMAX || 3;

const ModUsuer = (user, info) =>
  usuarios.splice(usuarios.indexOf(user), 1, Object.assign(user, info));

  const CrearUsuario = (id = undefined) => {
    let ide = id.trim()
     if(ide.length >= process.env.CLAVE)
     {
       let user = usuarios.find((data) => data.id == id);
       if(user == undefined)
       {
         try {
           let cliente = new Client({ authStrategy: new LocalAuth({ clientId: id }), });
           usuarios.push(Objeto(id, cliente));
           return true;
         } catch (error) {
           return {msg: `error -> ${error}`,
           off: true,}
         }
   
       }
       return true;
     }
     return {
       msg: `Codigo de usuario debe contener mas de ${process.env.CLAVE} caracteres`,
       off: true,
     }
   };

const DestroyCliente = (id) => {
  let user = usuarios.findIndex((data) => data.id == id);
  if (user !== -1) {
    usuarios[user].client.destroy();
    usuarios.splice(user, 1);
    return true;
  }
};

const UserConnect = (id) => {
  let user_info;
  if (
    usuarios.length == 0 ||
    usuarios.find((data) => data.id == id) == undefined
  )
    user_info = CrearUsuario(id);

  let user = usuarios.find((data) => data.id == id);

  if (user == undefined) return Promise.resolve(user_info);


  else if (user != undefined && user.estado == false && user.qr == false) {
    user.client.on("qr", (qr) => {
      console.log("ejecutando qr");
      if (user.nqr >= qrmax) {
        ModUsuer(user, {
          off: true,
          estado: false,
          qr: false,
          msg: "Se supero el limite de peticiones al servidor...",
        });
        DestroyCliente(user.id);
        return;
      }
      ModUsuer(user, { nqr: user.nqr + 1, qr: true, msg: qr });
    });

    user.client.on("ready", () => {
      ModUsuer(user, {
        estado: true,
        qr: false,
        nqr: 0,
        msg: "Ya es posible enviar mensajes...",
      });
    });

    user.client.on("disconnected", (result) => {
      DestroyCliente(user.id);
      console.log(`Usuario destruido ${user.id} por motivo ${result}`);
    });

    user.client.initialize();

    return new Promise((resolve) => {
      let interval = setInterval(() => {
        if (user.qr || user.estado) {
          clearInterval(interval);
          resolve(
            Object.assign(Object.assign({}, user), {
              client: usuarios.indexOf(user),
            })
          );
        }
      }, 500);
    });
  } else if (user.estado) {
    return new Promise((resolve) => {
    (async ()=> {
       ModUsuer(user, {msg : await user.client.getState()});
       resolve(Object.assign(Object.assign({}, user), {
          client: usuarios.indexOf(user),
        })
      );
       
    })()
  })
  } else if (user.qr && user.estado == false)
    return new Promise((resolve) => {
      let nqr = user.nqr;
      let interval = setInterval(() => {
        if (user.estado || nqr != user.nqr || user.off) {
          clearInterval(interval);
          resolve(
            Object.assign(Object.assign({}, user), {
              client: usuarios.indexOf(user),
            })
          );
        }
      }, 500);
    });
};

const CreateMessage = (client, message) => {
  for (const key in client) {
    message = message.replaceAll(`{{${key}}}`, client[key]);
  }
  return message;
};

const SendMessage = async (user, phone, msg) => {
  try {
    let response = await user.sendMessage(`${phone}@c.us`, msg);
    if (response.id.fromMe) return true;
    else return false;
  } catch (error) {
    console.log(error);
  }
};

const SendMessages = async (id, contactos, msg) => {

  if(!id || !contactos || !msg)
    return {
      msg: "Es requerido el codigo de usuario ,Contactos y Mensaje...",
      off: true,
    };

  let user = usuarios.find((data) => data.id == id);
  if (user == undefined || !user.estado)
    return {
      msg: "El usuario no se encuentra conecatado por favor , conectate...",
      off: true,
    };    
  let info = [];
  for (const contacto of contactos) {
    let status = await SendMessage(
      user.client,
      contacto.phone,
      CreateMessage(contacto, msg)
    );
    info.push(
      `Contacto : ${contacto.phone} -> Nombre ${
        contacto.name
      }. El mensaje fue un ${status ? "exito" : "fallo"}`
    );
  }
  return info;
};

module.exports = { UserConnect, SendMessages };
