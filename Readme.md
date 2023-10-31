# BPHR Documentation

Make sure you are in the `./fabric-sample/bphr` directory.

Run this script to shut down the network (if running), start the test-network, and finally install the chaincode.

```bash
bash startFabric.sh
```

We’ve started the network, installed the chaincode, and invoked `intiLedger`. Now, let’s see what our chaincode contains. To see the code, navigate to:

```bash
cd fabric-samples/bphr/chaincode/javascript/lib
```

Open `bphr.js`.

## Imports
1. `Contract` class from `fabric-contract-api` module. Note: `BPHR` class extends `Contract` class.
2. `ClientIdentity` class from `fabric-shim` module. This class will be used to get the ID of the invoking identity.

## Global variables
```javascript
let rewardID = 0;       
let userID = 0;         
let outletID = 0;       
let purchaseID = 0;     
let purchaseRecord = [];  
```
## Functions in the BPHR class

1. The `registerRewards` function is used to register a reward - it takes in the `rewardName` as parameters

```javascript
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
```

2. The `registerUser` function is used to register a user - it takes in the `userName` as parameters

```javascript
async registerUser(ctx, userName) {
    const user = {
        id: `USER${userID++}`,   
        name: userName,
    };
    await ctx.stub.putState(user.id, Buffer.from(JSON.stringify(user)));
    return JSON.stringify(user);
}
```

3. The `registerOutlet` function is used to register an outlet - it takes in the `outletName` as parameters

```javascript
async registerOutlet(ctx, outletName) {
    const outlet = {
        id: `OUTLET${outletID++}`,   
        name: outletName,
    };
    await ctx.stub.putState(outlet.id, Buffer.from(JSON.stringify(outlet)));
    return JSON.stringify(outlet);
}
```

4. `registerPurchase` function is used to register a purchase - it takes in the `name`, `date`, `outletName`, `userID` as parameters

```javascript
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
```

5. The `approvePurchase` takes in the `purchaseID` and `outletName` as a parameter and sets the `validated` field to `true` for that purchase if it exists in the ledger and the outlet name matches

```javascript
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
```

6. We take `rewardName` and `userName` as parameters and check if the user is eligible for the reward

```javascript
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
```

7. The `findConsecutiveDates` function takes in the purchases made by the user as a parameter and checks if the purchases are made on consecutive days

```javascript
findConsecutiveDates(purchases) {
    let maxCount = 1;
    let currentCount = 1;
    for (let i = 0; i < purchases.length - 1; i++) {
        const date1 = parseInt(purchases[i].Record.date);
        const date2 = parseInt(purchases[i + 1].Record.date);
        if (date2 - date1 === 1) {
            currentCount++;
            maxCount = Math.max(maxCount, currentCount);    
        } else { 
            currentCount = 1;
        }
    }
    return maxCount;
}
```

## Application Code

1. The `enrollAdmin.js` file is used to enroll the admin user. The admin user is used to register new users, outlets, and rewards. The admin user is also used to approve purchases and assign rewards to users.

2. The `addUser.js` file is used to register a new user. The user is registered with the name passed as a parameter to the `registerUser` function.

3. The `addOutlet.js` file is used to register a new outlet. The outlet is registered with the name passed as a parameter to the `registerOutlet` function.

4. The `addReward.js` file is used to register a new reward. The reward is registered with the name passed as a parameter to the `registerReward` function.

5. The `registerPurchase.js` file is used to register a new purchase by making a transaction. The purchase is registered with the name, date, outletID, and userID passed as parameters to the `registerPurchase` function.

6. The `approvePurchase.js` file is used to approve a purchase by making a transaction. The purchase is approved by passing the `purchaseID` and `outletName` as parameters to the `approvePurchase` function.

7. The `redeemReward.js` file is used to redeem a reward by making a transaction. The reward is redeemed by passing the `userName` and `rewardName` as parameters to the `redeemReward` function.

To run the application, we use the following commands:

1. To enroll the admin user
```bash
node enrollAdmin.js
```

2. To register a new user
```bash
node addUser.js <userName>
```

3. To register a new outlet
```bash
node addOutlet.js <outletName>
```

4. To register a new reward
```bash
node addReward.js <rewardName>
```

5. To register a new purchase
```bash
node registerPurchase.js <name> <date> <outletName> <userName>
```

6. To approve a purchase
```bash
node approvePurchase.js <purchaseID> <outletName>
```
Note that only the outlet where the purchase was made can approve the purchase. Other outlets cannot approve the purchase.

7. To redeem a reward
```bash
node redeemReward.js <userName> <rewardName>
```

## Test the network
To test the network, run the following command:

```bash
bash testNetwork.sh
```

## Fauxton - CouchDB

We can access the CouchDB database using Fauxton. To access Fauxton, open the following URL in your browser:

```bash
http://localhost:5984/_utils/
```

## Close the network

To close the network, run the following command:

```bash
bash networkDown.sh
```
