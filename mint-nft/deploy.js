import { SecretNetworkClient, Wallet } from "secretjs";
import path from "path";
import { fileURLToPath } from "url";

import * as fs from "fs";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const grpcWebUrl = process.env.GRPC_URL;

console.log("Loading wallet from mnemonic...");
var wallet = new Wallet(process.env.MNEMONIC);

console.log("Initializing secret.js...");
const secretjs = await SecretNetworkClient.create({
    grpcWebUrl,
    chainId: process.env.CHAIN_ID,
    wallet: wallet,
    walletAddress: wallet.address,
});

const debug = (title, msg) => {
    if (process.env.DEBUG) {
        console.log(`==== ${title} ====`);
        console.log(msg);
        console.log(`==== ${title} ====`);
    }
};

const uploadContract = async () => {
    console.log(`Uploading contract with sender address: ${wallet.address}`);
    let answer = { codeId: "", codeHash: "" };

    try {
        const tx = await secretjs.tx.compute.storeCode(
            {
                sender: wallet.address,
                wasmByteCode: fs.readFileSync(
                    `${__dirname}/snip721/contract.wasm.gz`
                ),
                source: "",
                builder: "",
            },
            {
                gasLimit: 5_000_000,
            }
        );

        debug("uploadContract", tx);

        const codeId = tx.arrayLog.find(
            (log) => log.type === "message" && log.key === "code_id"
        ).value;
        answer.codeId = codeId;
        console.log(`Code Id: ${codeId}`);
       
        if (codeId !== "") {
            const txHash = await secretjs.query.compute.code(codeId);
            answer.codeHash = txHash.codeInfo.codeHash;
            console.log(`Contract code hash: ${answer.codeHash}`);
        }
    } catch (err) {
        console.log(`Cannot upload contract:`, err);
    }
    return answer;
};

const instantiateContract = async (walletAddress, codeId, codeHash) => {
    console.log(`Instantiating contract with code id: ${codeId}...`);
    const tx = await secretjs.tx.compute.instantiateContract(
        {
            sender: walletAddress,
            codeId,
            codeHash,
            initMsg: {
                name: "Video Test NFT",
                symbol: "ENCVID",
                admin: walletAddress,
                entropy: "a2FraS1waXBpCg==",
                royalty_info: {
                    decimal_places_in_rates: 4,
                    royalties: [{ recipient: walletAddress, rate: 700 }],
                },
                config: { public_token_supply: true },
            },
            label: `scrt-nft-${Date.now()}`,
            initFunds: [],
        },
        {
            gasLimit: 5_000_000,
        }
    );

    debug("instantiateContract", tx);

    let contract = tx.arrayLog.find(
        (log) => log.type === "message" && log.key === "contract_address"
    ).value;

    return { contract: contract, codeHash: codeHash };
};

const mintNFT = async (walletAddress, contractAddress, codeHash) => {
    const publicMetadata = {
        extension: {
            image: "ipfs://QmaK5Y969GeFqcBmu5BAPWgXfwkU9hpQCYJRJyQdYtCBjz",
            description: "Encoded video example",
            attributes: [
                {
                    trait_type: "Animal",
                    value: "Bunny",
                },
            ],
        },
    };

    const privateMetadata = {
        extension: {
            image: "ipfs://QmaK5Y969GeFqcBmu5BAPWgXfwkU9hpQCYJRJyQdYtCBjz",
            description: "Encoded video example",
            attributes: [
                {
                    trait_type: "Animal",
                    value: "Bunny",
                },
            ],
            media: [
                {
                    file_type: "video",
                    extension: "m3u8",
                    authentication: {
                        key: "UainRqKrHz_62Gfx0Qv4Hg",
                        user: null,
                    },
                    url: "ipfs://QmVbKFQRNx166RuqyyEb8XMwnw7GY57g7sXgcmxxKrL9ms/main.m3u8",
                },
            ],
        },
    };

    const mintMsg = {
        mint_nft: {
            owner: walletAddress,
            public_metadata: publicMetadata,
            private_metadata: privateMetadata,
        },
    };

    let tx = await secretjs.tx.compute.executeContract(
        {
            sender: walletAddress,
            contractAddress,
            codeHash,
            msg: mintMsg,
            sentFunds: [],
        },
        {
            gasLimit: 60_000,
        }
    );

    debug("Mint", tx);
};

var initCodeData = {
    codeId: process.env.DEPLOYED_CODE_ID,
    codeHash: process.env.DEPLOYED_CODE_HASH,
};

if (!process.env.DEPLOYED_CODE_ID || !process.env.DEPLOYED_CODE_HASH) {
    console.log("uploading new contract...");
    initCodeData = await uploadContract();
}

let contract = {
    contract: process.env.DEPLOYED_CONTRACT_ADDRESS,
    codeHash: process.env.DEPLOYED_CODE_HASH
};

if (!contract.contract && initCodeData.codeId && initCodeData.codeHash) {
    console.log("instantiating new contract...");
    contract = await instantiateContract(
        wallet.address,
        initCodeData.codeId,
        initCodeData.codeHash
    );
    console.log(contract);
}

console.log(`Minting NFT...`);
await mintNFT(wallet.address, contract.contract, contract.codeHash);
console.log(`Done!`);