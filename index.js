const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// dotenv requirement
require('dotenv').config();


const app = express();
const port = process.env.PORT || 3000;

// middleWare
app.use(cors());
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@durjoys-db.smvgnqx.mongodb.net/?retryWrites=true&w=majority&appName=Durjoys-DB`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// JWT middlewares
const verifyJWT = (req, res, next) => {
    const token = req?.headers?.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized Access!' })
    }

    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(401).send({ message: 'Unauthorized Access!' })
        }

        req.tokenEmail = decoded.email;
        next()
    })

}

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.KNOWHIVE_EMAIL,
                pass: process.env.KNOWHIVE_EMAIL_PASS
            }
        });

        

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        const articlesCollection = client.db('knowHive').collection('articles');
        const commentsCollection = client.db('knowHive').collection('comments');

        // jwt token related apis
        app.post('/jwt', async (req, res) => {
            const userData = { email: req.body.email };
            const token = jwt.sign(userData, process.env.JWT_ACCESS_SECRET,
                { expiresIn: '7d' });
            res.send({ "token": token })
        })



        // Getting All Articles
        app.get('/articles', async (req, res) => {
            const cursor = await articlesCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })


        // Getting user Specific articles and implementing jwt
        app.get('/myArticles', verifyJWT, async (req, res) => {
            const userEmail = req.query.email;
            const decodedEmail = req.tokenEmail;

            if (decodedEmail !== userEmail) {
                return res.status(403).send({ message: 'Forbidden Access!' })
            }
            const query = {
                email: userEmail
            }
            const result = await articlesCollection.find(query).toArray();
            res.send(result);
        })

        // Getting id specific Articles

        app.get('/articles/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: new ObjectId(id) };
            const result = await articlesCollection.findOne(query);
            res.send(result);

        });


        app.get('/recentArticles', async (req, res) => {
            try {
                const recentArticles = await articlesCollection
                    .find({})
                    .sort({ createdAt: -1 })
                    .limit(6)
                    .toArray();
                res.send(recentArticles);
            } catch (error) {
                console.error('Error fetching recent articles:', error);
                res.status(500).send({ error: 'Failed to fetch recent articles.' });
            }
        });


        // Getting the articles by category
        app.get('/articles/category/:categoryName', async (req, res) => {
            const category = decodeURIComponent(req.params.categoryName);
            const articles = await articlesCollection.find({ category }).toArray();
            res.send(articles);
        })


        // Getting top contributors
        app.get('/top-contributors', async (req, res) => {
            try {
                const contributors = await articlesCollection.aggregate([
                    {
                        $group: {
                            _id: '$author_id',
                            username: { $first: '$username' },
                            authorImage: { $first: '$authorImage' },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 4 }
                ]).toArray();

                res.json(contributors);
            } catch (error) {
                console.error('Error fetching top contributors:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // getting All Contributors
        app.get('/contributors', async (req, res) => {
            try {

                const contributorsWithLastPost = await articlesCollection.aggregate([
                    {
                        $group: {
                            _id: '$author_id',
                            username: { $first: '$username' },
                            email: { $first: '$email' },
                            authorImage: { $first: '$authorImage' },
                            postCount: { $sum: 1 },
                            articles: {
                                $push: {
                                    _id: '$_id',
                                    title: '$title',
                                    createdAt: '$createdAt',
                                    date: '$date',
                                    thumbnailURL: '$thumbnailURL'
                                }
                            }
                        }
                    },
                    {
                        $addFields: {
                            lastArticle: {
                                $arrayElemAt: [
                                    {
                                        $slice: [
                                            {
                                                $filter: {
                                                    input: {
                                                        $sortArray: {
                                                            input: '$articles',
                                                            sortBy: { createdAt: -1 }
                                                        }
                                                    },
                                                    as: 'art',
                                                    cond: { $ne: ['$$art', null] }
                                                }
                                            }, 1
                                        ]
                                    }, 0
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            articles: 0
                        }
                    },
                    { $sort: { postCount: -1 } } // Optional: sort by most posts
                ]).toArray();

                res.json(contributorsWithLastPost);
            } catch (error) {
                console.error('Error fetching contributors:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Trending Tags Endpoint
        app.get('/trending-tags', async (req, res) => {
            try {
                const tags = await articlesCollection.aggregate([
                    { $unwind: '$tags' },
                    { $group: { _id: '$tags', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 3 }
                ]).toArray();
                res.json(tags);
            } catch (err) {
                res.status(500).json({ error: 'Failed to fetch tags' });
            }
        });


        // Posting New Article
        app.post('/articles', async (req, res) => {
            const newArticle = req.body;
            if (typeof newArticle.createdAt === 'string') {
                newArticle.createdAt = new Date(newArticle.createdAt);
            } else if (!newArticle.createdAt) {
                newArticle.createdAt = new Date();
            }
            console.log(newArticle);
            const result = await articlesCollection.insertOne(newArticle);
            res.send(result);
        })


        app.post('/subscribe', async (req, res) => {
            const { email } = req.body;
            // Send confirmation email
            const mailOptions = {
                from: `"KnowHive - Ultimate Knowledge Sharing Website" ${process.env.KNOWHIVE_EMAIL}`,
                to: email,
                subject: 'Subscription Confirmed',
                text: "Thank you for subscribing to KnowHive's newsletter!",
                html: `
                <h1>Thank you for subscribing to our newsletter!</h1>
                <p>Thank you for Showing interest in Our Website</p>
                
                `
            };

            try {
                await transporter.sendMail(mailOptions);
                res.json({ message: 'Subscription successful, confirmation email sent.' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Failed to send confirmation email.' });
            }
        });





        // Deleting Id specific data
        app.delete('/articles/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await articlesCollection.deleteOne(query);
            res.send(result);

        })

        // updating id specific data
        app.patch('/articles/:id', async (req, res) => {
            const id = req.params.id;
            const changes = req.body;
            changes.updatedAt = new Date();
            const query = { _id: new ObjectId(id) };
            const update = { $set: changes };
            const result = await articlesCollection.updateOne(query, update);
            res.send(result);
        })

        // Posting Likes
        app.patch('/articles/:id/like', async (req, res) => {
            const postId = req.params.id;
            console.log(postId);
            const query = { _id: new ObjectId(postId) };
            const update = { $inc: { likes: 1 } }
            const result = await articlesCollection.updateOne(query, update);
            res.send(result);
        });



        // Comment Related Apis


        // Getting All Comments
        app.get('/comments', async (req, res) => {
            const result = await commentsCollection.find().toArray();
            res.send(result)
        })

        // Getting article_id specific comments
        app.get('/comments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { article_id: id };
            const result = await commentsCollection.find(query).toArray();
            res.send(result);
        })



        // Posting Comments
        app.post('/comments', async (req, res) => {
            const commentData = req.body;
            const result = await commentsCollection.insertOne(commentData);
            res.send(result);
        })


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', async (req, res) => {
    res.send('KnowHive is Running....')
})







app.listen(port, () => {
    console.log(`KnowHive Running on port ${port}`);
})