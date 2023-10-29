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
let rewardID = 0;       // initializing the rewardID to 0 - this will be used to assign a unique ID to each reward
let userID = 0;         // initializing the userID to 0 - this will be used to assign a unique ID to each user
let outletID = 0;       // initializing the outletID to 0 - this will be used to assign a unique ID to each outlet
let purchaseID = 0;     // initializing the purchaseID to 0 - this will be used to assign a unique ID to each purchase
let purchaseRecord = [];    // initializing the purchaseRecord array - this will be used to store the purchase records
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
        id: `USER${userID++}`,   // assigning a unique ID to the user
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
        id: `OUTLET${outletID++}`,   // assigning a unique ID to the outlet
        name: outletName,
    };
    await ctx.stub.putState(outlet.id, Buffer.from(JSON.stringify(outlet)));
    return JSON.stringify(outlet);
}
```

4. `registerPurchase` function is used to register a purchase - it takes in the `name`, `date`, `outletName`, `userID` as parameters

```javascript
async registerPurchase(ctx, name, date, outletName, userID) {
    const purchase = {
        id: `PURCHASE${purchaseID++}`,
        name,
        date,
        outletName,         //outlet where the purchase was made
        userID,             //user for made the purchase
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

    const userPurchases = purchaseRecord.filter(p => p.userName === userName);
    // Debugging: Log the value of userPurchases
    console.log('User Purchases:', userPurchases);

    if (userPurchases.length >= 7) {
        const consecutiveDatesCount = this.findConsecutiveDates(userPurchases, userName);

        if (consecutiveDatesCount >= 7) {
            const rewardAsBytes = await ctx.stub.getState(rewardName);
            const reward = JSON.parse(rewardAsBytes.toString());
            // Debugging: Log the value of reward
            console.log('Reward:', reward);

            // Check if the user has already redeemed the reward
            if (reward.owner !== 'UNASSIGNED') {
                throw new Error(`${userName} has already redeemed ${rewardName}`);
            }
            reward.owner = userName;
            await ctx.stub.putState(rewardName, Buffer.from(JSON.stringify(reward)));
            return JSON.stringify(reward);
        }
    }

    throw new Error('Not eligible for reward redemption');
}
 
```

7. The `findConsecutiveDates` function takes in the purchases made by the user as a parameter and checks if the purchases are made on consecutive days

```javascript
findConsecutiveDates(purchases, userName) {
// dates are just integers for the sake of simplicity
// we filter the purchases made by the user from userID 
const userPurchases = purchases.filter(p => p.userName === userName);
// we sort the purchases by date
userPurchases.sort((a, b) => a.date - b.date);
// we initialize the consecutiveDates array to store the consecutive dates
let count = 1; // Initialize count to 1 since we have at least one purchase
let maxCount = 1; // Initialize maxCount to 1

for (let i = 0; i < userPurchases.length - 1; i++) {
    // if the difference between the dates is 1, we increment the count by 1 and update the maxCount if count exceeds it
    if (userPurchases[i + 1].date - userPurchases[i].date === 1) {
        count++;
        if (count > maxCount) {
            maxCount = count; 
        }
    } else {
        count = 1; // Reset count if dates are not consecutive
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