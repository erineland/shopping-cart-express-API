import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import methodOverride from 'method-override';
import uuidv1 from 'uuid/v1';
import dbconfig from '../../config/db';
import routes from '../../src/server/routes';
import ShoppingCartItem from '../../src/server/models/shoppingCartItem';

// Test utils
var request = require('supertest');

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { exportAllDeclaration } from '@babel/types';

// May require additional time for downloading MongoDB binaries
jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

let mongoServer;
let app;
describe('Routes', () => {
    beforeAll(async () => {
        app = express();
        app.use(bodyParser.json());
        app.use(bodyParser.json({
            type: 'application/vnd.api+json'
        }));
        app.use(bodyParser.urlencoded({
            extended: true
        }));
        app.use(methodOverride('X-HTTP-Method-Override'));
        var sess = {
            genid: function (req) {
                return uuidv1() // use UUIDs for session IDs
            },
            secret: 'keyboard cat',
            cookie: {}
        }
        app.use(session(sess));

        // connect to our mongoDB database
        mongoServer = new MongoMemoryServer();
        const mongoUri = await mongoServer.getConnectionString();
        await mongoose.connect(mongoUri, { useNewUrlParser: true }, (err) => {
            if (err) console.error(err);
        });
        routes(app);
    });

    afterAll(async () => {
        mongoose.disconnect();
        await mongoServer.stop();
    });

    it('Endpoint for adding an item', async () => {
        await request(app)
            .post('/api/shopping_cart_item')
            .send({
                title: 'iPhone XS',
                price: 999.99
            });

        // Assert that the item was inserted into the databse
        const expectedInsertedItem = await ShoppingCartItem.find({
            title: 'iPhone XS'
        });

        expect(expectedInsertedItem[0].title).toBe('iPhone XS')
    });

    it('Endpoint for deleting an item', async () => {
        // Add a test item to the database
        const itemToDeleteBody = {
            id: uuidv1(),
            title: 'testitemtodelete',
            price: 100,
            session: 'testsession'
        };

        const itemToDeleteId = itemToDeleteBody.id;
        const testItemToDelete = new ShoppingCartItem(itemToDeleteBody);
        // Save this test item to the database
        await testItemToDelete.save();

        const response = await request(app)
            .delete(`/api/shopping_cart_item/${itemToDeleteId}`);

        // Assert that the item was deleted from the databse
        const expectedDeletedItem = await ShoppingCartItem.find({
            id: itemToDeleteId
        });

        expect(expectedDeletedItem[0]).toBe(undefined)
    });
});
