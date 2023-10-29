'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        if (process.argv.length !== 4) {
            console.error('Usage: node approvePurchase.js <purchaseID> <outletName>');
            return;
        }

        const purchaseID = process.argv[2];
        const outletName = process.argv[3];

        // Load the network configuration
        const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get('admin');
        if (!identity) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
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
        
        // Submit the transaction to the chaincode
        await contract.submitTransaction('approvePurchase', purchaseID, outletID);
        // get the purchaseRecord array from the state and print it
        const purchaseRecordResponse = await contract.evaluateTransaction('queryPurchaseRecord');
        const purchaseRecord = JSON.parse(purchaseRecordResponse.toString());
        console.log(`Purchase record: ${JSON.stringify(purchaseRecord)}`);
        // print length of purchaseRecord array
        console.log(`Length of purchase record: ${purchaseRecord.length}`);
        console.log(`Transaction for purchase ID ${purchaseID} has been approved`);

        // Disconnect from the gateway.
        await gateway.disconnect();
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
