# Deployment Script

Here you can find a modified snip-721 that **allows everyone** to mint an NFT.  

**Build the contract:**
```bash
cd snip721
docker run --rm -v "$(pwd)":/contract --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry enigmampc/secret-contract-optimizer
```

**Run the script:**

```bash
#Rename .env.example to .env
npm install
node deploy.js
```

The example .env file already contains the information of the attached contract so it will just
mint a new NFT to your wallet.  
To deploy new contract edit the information on the .env file