const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectID;
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');
const admin = require("firebase-admin");
const SSLCommerzPayment = require('sslcommerz-lts');
require('dotenv').config();
const https = require('https');


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('products'));
app.use(express.static('blogs'));
app.use(fileUpload());
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fpbtl.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const serviceAccount = require('./configs/khandani-foods-bd-firebase-adminsdk-iijl7-1ec7d28021.json');


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false //true for live, false for sandbox
const port = 443;
const regularPort = 443;

// const allowedOrigins = [
//     'https://google.com',
//     'https://yahoo.com',
//     'https://mongodb.com',
//     'http://localhost:3000',
//     '*'
// ];



app.get('/', (req, res) => {
    res.send("hello from db it's working working")
})



const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {

    const usersCollection = client.db(process.env.DB_NAME).collection("users");
    const ordersCollection = client.db(process.env.DB_NAME).collection("orders");
    const productsCollection = client.db(process.env.DB_NAME).collection("products");
    const blogsCollection = client.db(process.env.DB_NAME).collection("blogs");
    const membersCollection = client.db(process.env.DB_NAME).collection("members");
    const transactionsCollection = client.db(process.env.DB_NAME).collection("transactions");
    // perform actions on the collection object



    // client site operations

    app.post('/addUser', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin
                .auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    const userInfo = req.body;

                    console.log({ tokenEmail, queryEmail })
                    if (tokenEmail === queryEmail) {
                        usersCollection.insertOne(userInfo)
                            .then(result => {
                                res.status(200).send(result.insertedCount > 0);
                            })
                    } else {
                        res.status(401).send('401 Unauthorized Access')
                    }
                })
        }
    })

    app.patch('/updateUser/:id', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin
                .auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    const userInfo = req.body;
                    const id = req.params.id;

                    console.log({ tokenEmail, queryEmail, userInfo })

                    if (tokenEmail === queryEmail) {
                        usersCollection.updateOne({ _id: ObjectId(id) }, {
                            $set: { name: userInfo.name, email: userInfo.email, phone: userInfo.phone, address: userInfo.address, city: userInfo.city }
                        })
                            .then(result => {
                                res.status(200).send(result.insertedCount > 0);
                            })
                    } else {
                        res.status(401).send('401 Unauthorized Access')
                    }
                })
        }

    })

    app.get('/getUser', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin
                .auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;

                    console.log({ tokenEmail, queryEmail })
                    if (tokenEmail === queryEmail) {
                        usersCollection.find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.status(200).send(documents[0]);
                            })
                    } else {
                        res.status(401).send('401 Unauthorized Access')
                    }
                })
        }
    })
    app.get('/userOrders', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            admin
                .auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;

                    console.log({ tokenEmail, queryEmail })

                    if (tokenEmail === queryEmail) {
                        ordersCollection.find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.status(200).send(documents);
                            })
                    } else {
                        res.status(401).send('401 Unauthorized Access')
                    }
                })
                .catch((error) => {
                    res.status(401).send('401 Unauthorized Access')
                });

        }
        else {
            res.status(401).send('401 Unauthorized Access')
        }
    })

    app.get('/getProductById/:id', (req, res) => {
        const id = req.params.id;
        //console.log(id);
        productsCollection.find({ id })
            .toArray((err, documents) => {
                res.send(documents[0])
            })
    })

    app.post('/getCartProducts', (req, res) => {
        const keys = req.body;

        console.log(keys)

        productsCollection.find({ id: { $in: keys } })
            .toArray((err, documents) => {
                if (documents.length > 0) {
                    //  console.log(documents)
                    res.send(documents)
                }
            })


        console.log(keys);
    })

    app.get('/homeBlogs',(req,res) => {
        blogsCollection.find({homeBlog: true})
        .toArray((err, documents) => {
            res.send(documents);
        })
    })

    app.get('/blogs',(req,res) => {
        blogsCollection.find({publish: true})
        .toArray((err, documents) => {
            res.send(documents);
        })
    })

    // admin-panel 

    app.get('/isAdmin/:email',(req,res) => {
        const email = req.params.email;

        membersCollection.find({role: 'admin', email: email})
        .toArray(( err, admins ) => {
            res.send(admins.length > 0)
        })
    })
    app.post('/addOrder', (req, res) => {
        const singleOrder = req.body;
        //   console.log(singleOrder);
        ordersCollection.insertOne(singleOrder)
            .then(result => {
                res.send(result.insertedCount > 0)
            })

    })

    app.post('/trackOrder', (req, res) => {
        const data = req.body;
        //  console.log(data);
        ordersCollection.find(data)
            .toArray((err, documents) => {
                res.send(documents);
                console.log(documents);
            })
    })

    app.post('/ordersByDate', (req, res) => {
        const date = req.body;
        // console.log(date)
        ordersCollection.find({ created: date.date })
            .toArray((err, documents) => {
                res.send(documents)
            })
    })

    app.get('/getOrders', (req, res) => {
        ordersCollection.find({ orderStatus: 'open' })
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    app.get('/getOrdersByYear/:year', (req, res) => {
        const year = parseInt(req.params.year);

        //  console.log({year})


        ordersCollection.find({ year })
            .toArray((err, documents) => {
                // console.log(documents[0])
                res.send(documents)
            })

        //
        // console.log();
    })

    app.patch('/updateStatus/:id', (req, res) => {
        const id = req.params.id;

        const status = req.body;

        //   console.log(id)

        //  console.log(status)
        // console.log(id,status);

        //updating payment status

        if (status.paymentStatus) {
            ordersCollection.updateOne({ _id: ObjectId(id) }, {
                $set: { paymentStatus: status.paymentStatus }
            })
                .then((result) => {
                    res.send(result.modifiedCount > 0)
                })
                .catch(err => {
                    console.log(err)
                })
        }

        //updating confirm order status

        else if (status.confirmStatus) {
            ordersCollection.updateOne({ _id: ObjectId(id) }, {
                $set: { confirmStatus: status.confirmStatus }
            })
                .then(result => {
                    res.send(result.modifiedCount > 0)
                })
        }
        //updating delivery status

        else if (status.deliveryStatus) {
            ordersCollection.updateOne({ _id: ObjectId(id) }, {
                $set: { deliveryStatus: status.deliveryStatus }
            })
                .then(result => {
                    res.send(result.modifiedCount > 0)
                })
        }

        // updating complete order status

        else if (status.completeStatus) {
            ordersCollection.updateOne({ _id: ObjectId(id) }, {
                $set: { completeStatus: status.completeStatus }
            })
                .then(result => {
                    res.send(result.modifiedCount > 0)
                })
        }

        else {
            ordersCollection.updateOne({ _id: ObjectId(id) }, {
                $set: { orderStatus: status.orderStatus }
            })
                .then(result => {
                    res.send(result.modifiedCount > 0)
                })
        }

    })

    app.patch('/updateClientInfo/:id', (req, res) => {
        const id = req.params.id;
        const clientInfo = req.body;

        //console.log(id, clientInfo);

        ordersCollection.updateOne({ _id: ObjectId(id) }, {
            $set: { name: clientInfo.name, phone: clientInfo.phone, email: clientInfo.email, city: clientInfo.city, address: clientInfo.address }
        })
            .then(result => {
                res.send(result.modifiedCount > 0)
            })


    })

    app.delete('/deleteOrder/:id', (req, res) => {
        const id = req.params.id;
        ordersCollection.deleteOne({ _id: ObjectId(id) })
            .then(result => {
                res.send(result.deletedCount > 0)
            })
    })

    // product related actions //

    app.post('/addProduct', (req, res) => {
        const file = req.files.image;
        const id = req.body.id;
        const title = req.body.title;
        const category = req.body.category;
        const description = req.body.description;
        const weight = req.body.weight;
        const productType = req.body.productType
        const regularPrice = req.body.regularPrice;
        const salePrice = req.body.salePrice;

        //  console.log({ file, id, title, category, description, weight, productType, regularPrice, salePrice });

        const filePath = `${__dirname}/products/${file.name}`;

        file.mv(filePath, err => {
            if (err) {
                console.log(err);

                res.status(500).send({ msg: 'file failed to upload' })
            }

            const newImg = fs.readFileSync(filePath);

            const encImg = newImg.toString('base64');

            var image = {
                name: file.name,
                contentType: file.mimetype,
                size: file.size,
                img: Buffer.from(encImg, 'base64')
            };

            productsCollection.insertOne({ id, title, category, description, weight, productType, regularPrice, salePrice, image })
                .then(result => {
                    fs.remove(filePath, error => {
                        if (error) {
                            console.log(error);
                            res.status(500).send({ msg: 'file failed to upload' })
                        }
                        res.send(result.insertedCount > 0);
                    })
                })


            // return res.send({ name: file.name , path:`/${file.name}`});
        })
    })

    app.get('/getProducts', (req, res) => {
        productsCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

   

    app.patch('/updateProduct/:id', (req, res) => {
        const _id = req.params.id;
        const file = req.files.image;
        const id = req.body.id;
        const title = req.body.title;
        const category = req.body.category;
        const description = req.body.description;
        const weight = req.body.weight;
        const productType = req.body.productType
        const regularPrice = req.body.regularPrice;
        const salePrice = req.body.salePrice;

        console.log({
            _id, id, file, title, category, description, weight, productType, regularPrice, salePrice
        })

        const filePath = `${__dirname}/products/${file.name}`;

        file.mv(filePath, err => {
            if (err) {
                console.log(err)
                res.status(500).send({ msg: 'file failed to upload' })
            }
            const newImg = fs.readFileSync(filePath);

            const encImg = newImg.toString('base64');

            var image = {
                name: file.name,
                contentType: file.mimetype,
                size: file.size,
                img: Buffer.from(encImg, 'base64')
            };

            productsCollection.updateOne({ _id: ObjectId(_id) }, {
                $set: { id, title, category, description, weight, productType, regularPrice, salePrice, image }
            })
                .then(result => {
                    fs.remove(filePath, error => {
                        if (error) {
                            console.log(error);
                            res.status(500).send({ msg: 'file failed to upload' })
                        }
                        res.send(result.modifiedCount > 0);
                    })
                })

        })
    })

    app.delete('/deleteProduct/:id', (req, res) => {
        const id = req.params.id;

        productsCollection.deleteOne({ _id: ObjectId(id) })
            .then(result => {
                res.send(result.deletedCount > 0)
            })
    })


    // Blog related actions //


    app.post('/addBlog', (req, res) => {

        const file = req.files.file;
        const title = req.body.title;
        const location = req.body.location;
        const description = req.body.description;
        const publish = req.body.publish;
        const created = req.body.created;



        const filePath = `${__dirname}/blogs/${file.name}`;

        file.mv(filePath, err => {
            if (err) {
                console.log(err)
                res.status(500).send({ msg: 'file failed to upload' })
            }

            const newImg = fs.readFileSync(filePath);

            const encImg = newImg.toString('base64');

            var image = {
                name: file.name,
                contentType: file.mimetype,
                size: file.size,
                img: Buffer.from(encImg, 'base64')
            };

            //  console.log({ title, file, location, description, publish, image })

            blogsCollection.insertOne({ title, location, description, image, publish, created })
                .then(result => {
                    fs.remove(filePath, error => {
                        if (error) {
                            console.log(error);
                            res.status(500).send({ msg: 'file failed to upload' })
                        }
                        res.send(result.insertedCount > 0);
                    })
                })


            // return res.send({ name: file.name , path:`/${file.name}`})
        })

    })

    app.get('/getBlogs', (req, res) => {
        blogsCollection.find({})
            .toArray((err, documents) => {
                res.send(documents)
            })
    })

    app.patch('/updateBlogPublishStatus/:id', (req, res) => {
        const id = req.params.id;
        const publish = req.body;

        console.log(publish)

        blogsCollection.updateOne({ _id: ObjectId(id) }, {
            $set:  publish 
        })
            .then(result => {
                res.send(result.modifiedCount > 0);
            })

    })

    app.patch('/updateBlogPublishHomeStatus/:id', (req, res) => {
        const id = req.params.id;
        const homeBlog = req.body;

        console.log(homeBlog)

        blogsCollection.updateOne({ _id: ObjectId(id) }, {
            $set:  homeBlog 
        })
            .then(result => {
                res.send(result.modifiedCount > 0);
            })

    })

    app.patch('/updateBlog/:id', (req, res) => {
        const id = req.params.id;
        const file = req.files.file;
        const title = req.body.title;
        const location = req.body.location;
        const description = req.body.description;

        const filePath = `${__dirname}/blogs/${file.name}`;

        if (file) {

            file.mv(filePath, err => {
                if (err) {
                    console.log(err)
                    res.status(500).send({ msg: 'file failed to upload' })
                }

                const newImg = fs.readFileSync(filePath);

                const encImg = newImg.toString('base64');

                var image = {
                    name: file.name,
                    contentType: file.mimetype,
                    size: file.size,
                    img: Buffer.from(encImg, 'base64')
                };




                //  console.log({ title, location, description, image })

                blogsCollection.updateOne({ _id: ObjectId(id) }, {
                    $set: { title, location, description, image }
                }).then(result => {
                    fs.remove(filePath, error => {
                        if (error) {
                            console.log(error);
                            res.status(500).send({ msg: 'file failed to upload' })
                        }
                        res.send(result.modifiedCount > 0);
                    })
                })

            })

        }
        else {
            blogsCollection.updateOne({ _id: ObjectId(id) }, {
                $set: { title, location, description }
            })
                .then(result => {
                    res.send(result.matchedCount > 0)
                })
        }


        // console.log({ id, file, title, location, description })

    })

    app.delete('/deleteBlog/:id', (req, res) => {
        const id = req.params.id;

        blogsCollection.deleteOne({ _id: ObjectId(id) })
            .then(result => {
                res.send(result.deletedCount > 0);
            })
    })

    app.post('/addMember',(req,res) => {
        const data = req.body;
        console.log(data)
        membersCollection.insertOne(data)
        .then(result => {
            res.send( result.insertedCount > 0 )
        })
    })

    app.get('/members', (req,res) => {
        membersCollection.find({})
        .toArray(( err, documents ) => {
            res.send(documents);
        })
    })

    app.patch('/updateMember/:id', (req, res) => {
        const data = req.body;

        membersCollection.updateOne({ _id: ObjectId(id) }, {
            $set: { name: data.name, email: data.email, phone: data.phone, image: data.image, role: data.role, designation: data.designation, nid: data.nid, address: data.address, city: data.city  }
        })
        .then( result => {
            res.send( result.modifiedCount > 0 );
        })
    })

    app.delete('/deleteMember/:id',(req, res) => {
        const id = req.params.id;

        membersCollection.deleteOne({_id: ObjectId(id)})
        .then( result => {
            res.send( result.deletedCount > 0)
        })
    })

    

    // sslcommerz payment gateway oprerations 

    //sslcommerz init

    app.post('/ssl-payment-gateway-sandbox', (req, res) => {
        const info = req.body;
        const { orderId, totalBill, name, email, phone, city, shippingCost, cart, address } = info;

        const totalAmount = totalBill + shippingCost


        //  console.log(info)
        const data = {
            total_amount: totalAmount,
            currency: 'BDT',
            tran_id: '#' + orderId, // use unique tran_id for each api call
            success_url: 'http://khandanifoodsbd.com:443/ssl-payment-gateway-sandbox/success',
            fail_url: 'http://khandanifoodsbd.com:443/ssl-payment-gateway-sandbox/fail',
            cancel_url: 'http://khandanifoodsbd.com:443/ssl-payment-gateway-sandbox/cancel',
            ipn_url: 'http://khandanifoodsbd.com:443/ssl-payment-gateway-sandbox/ipn',
            shipping_method: 'Courier',
            product_name: 'null',
            product_category: 'null',
            product_profile: 'null',
            cus_name: name,
            cus_email: email,
            cus_add1: address,
            cus_add2: null,
            cus_city: city,
            cus_state: city,
            cus_postcode: null,
            cus_country: 'Bangladesh',
            cus_phone: phone,
            cus_fax: null,
            ship_name: name,
            ship_add1: address,
            ship_add2: null,
            ship_city: city,
            ship_state: city,
            ship_postcode: 1000,
            ship_country: 'Bangladesh',
        };

        // console.log(data)
        const sslcz = new SSLCommerzPayment(process.env.STORE_ID, process.env.STORE_PASS, false)
        sslcz.init(data).then((data, err) => {
            // Redirect the user to payment gateway
            //console.log(apiResponse)
            // console.log(data)
            console.log(data.status);
            let GatewayPageURL = data.GatewayPageURL;

            // console.log(GatewayPageURL)
            if (GatewayPageURL) {
                res.setHeader('Content-Type', 'application/json')
                res.status(200).redirect(data.GatewayPageURL)
                //  return res.status(200).send(GatewayPageURL)

            }
            else {
                res.status(400).send('error')
            }

            console.log('Redirecting to: ', GatewayPageURL)
        });
    })


    app.post('/ssl-payment-gateway-sandbox/success', (req, res) => {
        const status = req.body.status;
        const tranData = req.body;
      
        if (status === 'VALID') {
            const data = {
                val_id: req.body.val_id
                //that you go from sslcommerz response
            };
            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
            sslcz.validate(data).then(data => {
                console.log(data.status)
                transactionsCollection.insertOne(tranData)
                .then( result => {
                    if(result.insertedCount > 0) {
                        let url = 'http://localhost:3000/orderIsOnWay';
                        const tran_id = req.body.tran_id.split('#')[1]
                        res.redirect(`${url}/payment_success?tran_id=${tran_id}&amount=${tranData.amount}`)
                    }
                 })
                //process the response that got from sslcommerz 
                // https://developer.sslcommerz.com/doc/v4/#order-validation-api
            });
          }
        })

    app.post('/fail', (req, res) => {
        return res.status(400).json({
            data: req
        })
    })

    app.post('/cancel', (req, res) => {
        return res.status(200).json({
            data: req.body
        })
    })

    app.post('/ipn', (req, res) => {
        return res.status(200).json({
            data: req.body
        })
    })


    // app.get('/initiate-refund', (req, res) => {
    //     const data = {
    //         refund_amount: 10,
    //         refund_remarks: '',
    //         bank_tran_id: 'CB5464321445456456',
    //         refe_id: 'EASY5645415455',
    //     };
    //     const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
    //     sslcz.initiateRefund(data).then(data => {
    //         //process the response that got from sslcommerz 
    //         //https://developer.sslcommerz.com/doc/v4/#initiate-the-refund
    //     });

    // })

    console.log('Database Connected Successfully');

});





//  app.use(cors({
//      origin: function(origin, callBack){

//         if(!origin){
//             return callBack(null,true);
//         }
//         if(allowedOrigins.indexOf(origin) === -1){
//             var msg = `The CORS policy for this site does not allow access from the specified Origin. ${allowedOrigins} & ${allowedOrigins.indexOf(origin)}`;
//             return callBack( new Error(msg), false);
//         }
//         return callBack(null,true)
//      }
//  }));


// const sslServer = https.createServer({
//     key: fs.readFileSync(`${__dirname}/cert/key.pem`),
//     cert: fs.readFileSync(`${__dirname}/cert/cert.pem`)
// }, app)

// sslServer.listen(port, () => console.log('Secure server on port 443'))

app.listen(regularPort);

//app.listen(process.env.PORT || port);
