const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// https://warehouse-server-nu.vercel.app/
// https://warehouse-server-tanzirislam1.vercel.app

/* middleware */
app.use(cors());
app.use(express.json());

/* middletare function */

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  // console.log('inside verifyToken', authHeader);
  if (!authHeader) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  const token = authHeader.split(' ')[1];
  console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(403).send({ message: 'Forbiden access' })
    }
    console.log(decoded);
    req.decoded = decoded;
    next();
  });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9b7hzzl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
  try {
    // Connect to the MongoDB cluster
    await client.connect();
    console.log('db connect');

    const carCollection = client.db('carStock').collection('carCollection');

    app.get('/inventoryItems', async (req, res) => {
      const query = {};
      const cursor = carCollection.find(query);
      const result = await cursor.toArray();
      res.json(result);
    });

    app.get('/inventoryItems/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const result = await carCollection.findOne(query);
      res.send(result);
    });

    /* create token api */

    app.post('/signup', (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1d'
      })
      res.send({ accessToken });
    });

    app.post('/login', (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: 60 * 60
      });
      res.send({ accessToken });
    });

    /* deliverd */

    app.put("/stockItem/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const quantity = req.body;
      console.log(quantity);
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          quantity: quantity.quantity,
        },
      };
      const result = await carCollection.updateOne(query, updatedDoc, options);
      console.log(result);
      res.send(result);
    });

    /* restock item */
    app.put("/stockItems/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const updateStockQuantity = req.body;
      // console.log(updateStockQuantity);
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          quantity: updateStockQuantity.quantity,
        },
      };
      const result = await carCollection.updateOne(query, updatedDoc, options);
      res.send(result);
    });

    /* add item */

    app.post('/addItem', async (req, res) => {
      const newItem = req.body;
      console.log(newItem);
      const result = await carCollection.insertOne(newItem);
      res.send(result);
    });

    // order collection api

    app.get('/myItems', verifyToken, async (req, res) => {
      const decodedEmail = req.decoded.email;
      // console.log(decodedEmail);
      const email = req.query.email;
      // console.log(email);
      if (email === decodedEmail) {
        const query = { email: email };
        const cursor = carCollection.find(query);
        const myItem = await cursor.toArray();
        res.send(myItem);
      }
      else {
        res.status(403).send({ message: 'Forbiden access' });
      }
    });

    /* delete Item */

    app.delete('/deleteItem/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) }
      const result = await carCollection.deleteOne(query);
      res.send(result);
    });

  }
  catch (error) {
    console.error(error);
  }
  finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Auto Zone Server');
});

app.listen(port, () => {
  console.log(port);
});