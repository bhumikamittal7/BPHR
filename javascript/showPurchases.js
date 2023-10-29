'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        if (process.argv.length !== 3) {
            console.error('Usage: node showPurchases.js <userName>');
            return;
        }

        const userName = process.argv[2];

        // Load the network configuration
        const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get(userName);
        if (!identity) {
            console.log(`An identity for the user ${userName} does not exist in the wallet`);
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: userName,
            discovery: { enabled: true, asLocalhost: true }, // Use asLocalhost as false if not running on localhost
        });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('bphr');

        // Query purchases by user
        const result = await contract.evaluateTransaction('listPurchasesByUser', userName);
        const purchases = JSON.parse(result.toString());

        console.log(`Purchases made by ${userName}:`);
        purchases.forEach(purchase => {
            console.log(`ID: ${purchase.Record.id}, Outlet: ${purchase.Record.outletID}, Date: ${purchase.Record.date}`);
        });

        // Disconnect from the gateway.
        await gateway.disconnect();
    } catch (error) {
        console.error(`Failed to list purchases: ${error}`);
        process.exit(1);
    }
}

main();
