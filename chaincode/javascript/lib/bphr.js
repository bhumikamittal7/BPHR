/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {Contract} = require('fabric-contract-api');
const ClientIdentity = require('fabric-shim').ClientIdentity;

let rewardID = 0;       // initializing the rewardID to 0 - this will be used to assign a unique ID to each reward
let userID = 0;  
let outletID = 0;       // initializing the outletID to 0 - this will be used to assign a unique ID to each outlet
let purchaseID = 0;     // initializing the purchaseID to 0 - this will be used to assign a unique ID to each purchase
let purchaseRecord = [];    // initializing the purchaseRecord array - this will be used to store the purchase records

class bphr extends Contract {

// the initLedger function is used to initialize the ledger with some sample data - this is the first block (genesis block) of the blockchain
// THIS IS NOT GENSIS BLOCK
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        // we will add the code here later - this will be invoked when the chaincode is instantiated
        console.info('============= END : Initialize Ledger ===========');
    }

    
// the registerRewards function is used to register a reward - it takes in the rewardName as parameters
    async registerRewards(ctx, rewardName) {
        const reward = {
            id: `REWARD${rewardID++}`,
            name: rewardName,
            owner: 'UNASSIGNED',        // setting the owner field to UNASSIGNED by default - this will be updated when the reward is assigned to a user
        };
        // storing the reward object in the ledger - await is used to wait for the promise to be resolved
        await ctx.stub.putState(reward.id, Buffer.from(JSON.stringify(reward)));
        // returning the reward object as a string
        return JSON.stringify(reward);
}

    // the registerOutlet function is used to register an outlet - it takes in the outletName as a parameter
    async registerOutlet(ctx, outletName) {
        const outlet = {
            id: `OUTLET${outletID++}`,   // assigning a unique ID to the outlet
            name: outletName,
        };
        await ctx.stub.putState(outlet.id, Buffer.from(JSON.stringify(outlet)));
        return JSON.stringify(outlet);
    }

    // the registerUser function is used to register an user - it takes in the userName as a parameter
    async registerUser(ctx, userName) {
        const user = {
            id: `USER${userID++}`,   // assigning a unique ID to the user
            name: userName,
        };
        await ctx.stub.putState(user.id, Buffer.from(JSON.stringify(user)));
        return JSON.stringify(user);
    }

    // register Purchase function is used to register a purchase - it takes in the date, outletID, userID as parameters
    async registerPurchase(ctx, name, date, outletName, userName) {
        const purchase = {
            id: `PURCHASE${purchaseID++}`,
            name,
            date,
            outletName,         //outlet where the purchase was made
            userName,             //user for made the purchase
            validated: false,        // setting the validated field to false by default - this will be set to true when the purchase is approved by the outlet
        };
        await ctx.stub.putState(purchase.id, Buffer.from(JSON.stringify(purchase)));
        return JSON.stringify(purchase);
    }

    // the queryOutletID function takes in the outletName as a parameter and returns the outletID if it exists in the ledger
    async queryOutletID(ctx, outletName) {
        const queryString = {
            selector: {
                name: outletName,
            },
        };
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));
        return queryResults.toString();
    }
    
    // the queryUserID function takes in the userName as a parameter and returns the userID if it exists in the ledger
    async queryUserID(ctx, userName) {
        const queryString = {
            selector: {
                name: userName,
            },
        };
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));
        return queryResults.toString();
    }

    // the queryWithQueryString function takes in the queryString as a parameter and returns the results of the query
    async queryWithQueryString(ctx, queryString) {
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const results = await this.getAllResults(resultsIterator, false);
        return JSON.stringify(results);
    }

    // getPurchasesByOutlet function takes in the outletID as a parameter and returns the purchases made at that outlet
    async getPurchasesByOutlet(ctx, outletID) {
        const queryString = {
            selector: {
                outletID,
            },
        };
        const resultsIterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = await this.getAllResults(resultsIterator, false);
        return JSON.stringify(results);
    }

    // list all the purchases made by a user
    async listPurchasesByUser(ctx, userName) {
        const queryString = {
            selector: {
                userName: userName,
            },
        };
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));
        //return array of purchases
        return JSON.parse(queryResults.toString());
        }

    // get reward by name
    async getRewardByName(ctx, rewardName) {
        const queryString = {
            selector: {
                name: rewardName,
            },
        };
        const queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));
        return JSON.parse(queryResults.toString());
    }

    // the queryPurchaseRecord function returns the purchaseRecord array
    async queryPurchaseRecord(ctx) {
        return JSON.stringify(purchaseRecord);
    }

    // the getAllResults function takes in the resultsIterator as a parameter and returns the results of the query
    async getAllResults(iterator, isHistory) {
        const allResults = [];

        while (true) {

            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {

                const jsonRes = {};
                console.log(res.value.value.toString('utf8'));

                if (isHistory && isHistory === true) {
                        
                        jsonRes.TxId = res.value.tx_id;
                        jsonRes.Timestamp = res.value.timestamp;
                        jsonRes.IsDelete = res.value.is_delete.toString();
                        try {
                            jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
                        } catch (err) {
                            console.log(err);
                            jsonRes.Value = res.value.value.toString('utf8');
                        }
    
                    }
                    else {
                        jsonRes.Key = res.value.key;

                        try {
                            jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
                        } catch (err) {
                            console.log(err);
                            jsonRes.Record = res.value.value.toString('utf8');
                        }
                    }
                    allResults.push(jsonRes);
                }
                if (res.done) {
                    console.log('end of data');
                    await iterator.close();
                    console.info(allResults);
                    return allResults;
                }
            }
        }
    // the approvePurchase take in the purchaseID and outlet name as a parameter and sets the validated field to true for that purchase if it exists in the ledger and the outlet name matches
    async approvePurchase(ctx, purchaseID, outletName) {
        const purchaseAsBytes = await ctx.stub.getState(purchaseID);

        if (!purchaseAsBytes || purchaseAsBytes.length === 0) {
            throw new Error(`${purchaseID} does not exist`);
        }
    
        const purchase = JSON.parse(purchaseAsBytes.toString());
    
        if (purchase.outletName !== outletName) {
            throw new Error(`${outletName} is not the owner of ${purchaseID}`);
        }
    
        purchase.validated = true;
    
        await ctx.stub.putState(purchaseID, Buffer.from(JSON.stringify(purchase)));
        purchaseRecord.push(purchase);

        return JSON.stringify(purchase);
    }
    

    async redeemReward(ctx, userName, rewardName) {
        const userPurchases = await this.listPurchasesByUser(ctx, userName);
        const consecutiveDatesCount = this.findConsecutiveDates(userPurchases);

        if (consecutiveDatesCount >= 7) {
            const reward = await this.getRewardByName(ctx, rewardName);

            if (reward[0].Record.owner !== 'UNASSIGNED') {
                throw new Error(`${userName} has already redeemed ${rewardName}`);
            }
            reward[0].Record.owner = userName;
            await ctx.stub.putState(reward[0].Record.id, Buffer.from(JSON.stringify(reward[0].Record)));
            return JSON.stringify(reward);
        }
        if (consecutiveDatesCount < 7) {
            throw new Error(`${userName} has made only ${consecutiveDatesCount} purchases. Not eligible for reward redemption`);
        }
    }


// the findConsecutiveDates function takes in the purchases made by the user as a parameter and checks if the purchases are made on consecutive days
    findConsecutiveDates(purchases) {
        let maxCount = 1;
        let currentCount = 1;
        // throw new Error(`hello aarav: ${purchases}`);     //this shows that the length of this array is 0, so the for loop doesn't run
        // for the purchases array, we check if the current purchase and the next purchase are made by the same user
        for (let i = 0; i < purchases.length - 1; i++) {
            // if the current purchase and the next purchase are made by the same user, we check if the dates are consecutive
                // Extract and parse the date as an integer - this returns a number like 1, 2, 3, ...
            const date1 = parseInt(purchases[i].Record.date);
            const date2 = parseInt(purchases[i + 1].Record.date);
            // throw new Error(`${date1} and ${date2} are consecutive`);
            // if the difference between the dates is 1, we increment the currentCount and update the maxCount
            if (date2 - date1 === 1) {
                // throw new Error(`${date1} and ${date2} are consecutive`);
                currentCount++;
                maxCount = Math.max(maxCount, currentCount);    // Math.max returns the maximum of the two numbers
            } else { // else we reset the currentCount to 1
                currentCount = 1;
            }
        
        }
        // we return the maxCount
        // throw new Error(`Max consecutive dates: ${maxCount}`);

        return maxCount;
    }

}

module.exports = bphr;
