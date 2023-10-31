#!/bin/bash

# Run Fabric
bash startFabric.sh

# Navigate to javascript directory
cd javascript

# Enroll Admin
node enrollAdmin.js

# Add Users
node addUser.js Bhumika
node addUser.js Prabal

# Add Reward, Outlets, Purchases, and Redeem Reward
node addReward.js Gift
node addOutlet.js Fuelzone
node addOutlet.js Dhabha

for i in {1..7}
do
  node registerPurchase.js Juice $i Fuelzone Bhumika
done

for i in {0..6}
do
  node approvePurchase.js PURCHASE$i Fuelzone
done


node redeemReward.js Bhumika Gift
