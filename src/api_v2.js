const { Client, LocalAuth } = require("whatsapp-web.js");

function Users(id) {
  this.id = id;
  this.index = null;
  this.client = null;
  this.estado = false;
  this.qr = false;
  this.nqr = 0;
  this.msg = null;
  this.off = false;
}

const users = [];

const isIdValid = (id) => /^[a-zA-Z0-9_-]+$/.test(id);

const User = (id) => {
  if (!users.find((user) => user.id == id)) {
    users.push(new Users(id));
    return users.find((user, i) => {
      if (user.id == id) {
        user.index = i;
        user.client = new Client({
          authStrategy: new LocalAuth({ clientId: id }),
        });
        return user;
      }
    });
  }
  return users.find((user, i) => {
    if (user.id == id) {
      user.index = i;
      return user;
    }
  });
};

const UserConnect = (id) => {
  let user = User(id);

  if (user.qr == false && user.estado == false) {
    user.client.on("qr", (qr) => {
      if (user.nqr >= 3) {
        user.client.destroy();
        user.off = true;
        user.estado = false;
        user.msg = "Se supero el limite de peticiones al servidor...";
        users.splice(user.index, 1);
        return;
      }
      user.qr = true;
      user.nqr += 1;
      user.msg = qr;
    });

    user.client.on("ready", () => {
      user.estado = true;
      user.qr = false;
      user.msg = "Todo listo para enviar mensajes...";
    });

    user.client.on("disconnected", (info) => {
      user.client.destroy();
      users.splice(user.index, 1);
    });

    user.client.initialize();

    return new Promise((res) => {
      let interval = setInterval(() => {
        if (user.qr || user.estado) {
          clearInterval(interval);
          res({ ...user, client: null });
        }
      }, 500);
    });
  }

  if (user.estado)
    return new Promise(async (res) => {
      user.msg = await user.client.getState();
      res({ ...user, client: null });
    });
  if (user.estado == false && user.qr)
    return new Promise((res) => {
      let nqr = user.nqr;
      let interval = setInterval(() => {
        if (user.estado || user.off || user.nqr != nqr) {
          clearInterval(interval);
          res({ ...user, client: null });
        }
      }, 500);
    });
};

const remplazarVariables = (mensaje, objeto) => {
  const expresionRegular = /\{\{(.*?)\}\}/g;
  return mensaje.replace(expresionRegular, (coincidencia, variable) => {
    return objeto[variable] || "";
  });
};

const SendMessages = async (id, contactos, msg) => {

  let user = users.find((data) => data.id == id);
  if (!user || !user.estado)
    return {
      msg: "El usuario no se encuentra conecatado por favor , conectate...",
      off: true,
    };

    let resultado = []
  for (const contacto of contactos) {
    let message = remplazarVariables(msg, contacto);
    let response = await user.client.sendMessage(`${contacto.phone}@c.us`, message);
    if (response.id.fromMe)
    {resultado.push(`[${contacto.phone}] >->  Se envio de manera exitosa. \n`)}else{
        resultado.push(`[${contacto.phone}] >->  Mensaje no enviado. \n`)
    }
  }
  return resultado
};

module.exports = { UserConnect , SendMessages , isIdValid};
