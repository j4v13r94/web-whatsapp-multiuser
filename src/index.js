require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
let { UserConnect, SendMessages, isIdValid} = require("./api_v2");

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.post("/api", (req, res) => {
  const { id, action, token , clientes , msg} = req.body;


  if (process.env.TOKEN === token && isIdValid(id)){
    (async () => {

      switch (action) {
        case "connect":
          res.send(await UserConnect(id));
          break;
        case "sendmessages":
          res.send(await SendMessages(id,clientes, msg));
          break;
  
        default:
          break;
      }
  
    })()

  }else{
    
    res.send({
      msg: (!isIdValid(id))? 'El idnetificador del usuario debe ser [Alfanumerico-_]' : 'Token de seguridad no valido por favor verifica...',
      off: true,
    })
    return;}



 

});

// Loading frontend
app.use( express.static(path.join(__dirname, "../dist/") ));

app.get("*", function (_, res) {
  res.sendFile(
    path.join(__dirname, "./index.html"),
    function (err) {
      if (err) {
        res.status(500).send(err);
      }
    }
  );
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
