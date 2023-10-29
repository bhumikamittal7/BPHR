'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Load the network configuration
        const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check if there are enough command-line arguments
        if (process.argv.length < 5) {
            console.log('Usage: node registerPurchase.js <name> <date> <outletName> <userName>');
            return;
        }

        const name = process.argv[2];
        const date = process.argv[3];
        const outletName = process.argv[4];
        const userName = process.argv[5];


        // Check to see if we've already enrolled the user.
        const identity = await wallet.get('admin');
        if (!identity) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            return;
        }

        // Check if outletName is registered
        const outletIdentity = await wallet.get(outletName);
        if (!outletIdentity) {
            console.log(`Outlet ${outletName} is not registered. Please register the outlet first.`);
            return;
        }

        // Check if userName is registered
        const userIdentity = await wallet.get(userName);
        if (!userIdentity) {
            console.log(`User ${userName} is not registered. Please register the user first.`);
            return;
        }
        
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'admin',
            discovery: { enabled: true, asLocalhost: true }, // Use asLocalhost as false if not running on localhost
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('bphr');

        // Query for outlet ID
        const outletIDResponse = await contract.evaluateTransaction('queryOutletID', outletName);
        const outletID = outletIDResponse.toString();

        // Query for user ID
        const userIDResponse = await contract.evaluateTransaction('queryUserID', userName);
        const userID = userIDResponse.toString();

        // Submit the transaction to the chaincode with IDs
        await contract.submitTransaction('registerPurchase', name, date, outletID, userID);
        //print the transaction
        console.log(`Transaction has been submitted,\n Item Purchased: ${name}\n, date: ${date}\n, outlet: ${outletID}\n, user: ${userID}`);

        // Disconnect from the gateway.
        await gateway.disconnect();
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();