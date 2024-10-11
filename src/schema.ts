import { SchemaComposer } from 'graphql-compose';
import axios from 'axios';
import { AxiosError } from 'axios';

const schemaComposer = new SchemaComposer();

const ENERGY_COST_PER_BYTE = 4.56;

// Define the Transaction type
schemaComposer.createObjectTC({
  name: 'Transaction',
  fields: {
    hash: 'String!',
    size: 'Int!',
    energyCost: 'Float!',
  },
});

// Define the Block type
schemaComposer.createObjectTC({
  name: 'Block',
  fields: {
    hash: 'String!',
    index: 'Int!',
    transactions: '[Transaction!]!',
  },
});

// Function to calculate energy cost
const calculateEnergyCost = (size: number) => size * ENERGY_COST_PER_BYTE;

// Function to fetch block data by date
const fetchBlockDataByDate = async (date: number) => {
  try {
    const response = await axios.get(`https://blockchain.info/blocks/${date}?format=json`);
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch block data for date ${date}: ${error.response?.data?.error || error.message}`);
    } else {
      throw new Error(`An unexpected error occurred: ${error.message}`);
    }
  }
};

// Function to calculate total energy consumption for a list of blocks
const calculateTotalEnergyConsumption = async (blocks: { hash: string }[]) => {
  const totalEnergyConsumption: number[] = await Promise.all(blocks.map(async (block) => {
    try {
      // Fetch block data from blockchain.info API using block hash
      const blockResponse = await axios.get(`https://blockchain.info/rawblock/${block.hash}`);
      const blockData = blockResponse.data;

      // Calculate the energy cost for the block's transactions
      const blockEnergyCost = blockData.tx.reduce((blockTotal: number, tx: { size: number }) => {
        // console.log(`Transaction: ${JSON.stringify(tx.size)}`); // Log the value of tx
        return blockTotal + calculateEnergyCost(tx.size);
      }, 0);

      return blockEnergyCost;
    } catch (error: any) {
      console.error(`Failed to fetch transactions for block ${block.hash}: ${error.message}`);
      return 0; // Return 0 if there's an error
    }
  }));

  return totalEnergyConsumption.reduce((total, blockEnergyCost) => total + blockEnergyCost, 0);
};


// Add the queries
schemaComposer.Query.addFields({
  hello: {
    type: 'String!',
    resolve: () => 'Hi there, good luck with the assignment!',
  },
  latestBlock: {
    type: 'Block',
    resolve: async () => {
      // Implement the logic to fetch the latest block
    },
  },
  blocksByDay: {
    type: '[Block]',
    args: { timestamp: 'String!' },
    resolve: async (_, { timestamp }) => {
      // Implement the logic to fetch blocks by day
    },
  },
  block: {
    type: 'Block',
    args: { hash: 'String!' },
    resolve: async (_, { hash }) => {
      // Implement the logic to fetch a block by hash
    },
  },
  transaction: {
    type: 'Transaction',
    args: { hash: 'String!' },
    resolve: async (_, { hash }) => {
      // Implement the logic to fetch a transaction by hash
    },
  },
  transactionsByAddress: {
    type: '[Transaction]',
    args: { address: 'String!' },
    resolve: async (_, { address }) => {
      // Implement the logic to fetch transactions by address
    },
  },
  energyConsumptionPerTransaction: {
    type: 'Float!',
    args: { blockHash: 'String!', transactionHash: 'String!' },
    resolve: async (_, { blockHash, transactionHash }) => {
      try {
        // Fetch block data from blockchain.info API
        const blockResponse = await axios.get(`https://blockchain.info/rawblock/${blockHash}`);
        const blockData = blockResponse.data;

        // Find the specific transaction within the block
        const transaction = blockData.tx.find((tx: any) => tx.hash === transactionHash);

        if (!transaction) {
          throw new Error('Transaction not found in the specified block');
        }

        // Calculate the energy cost based on the transaction size
        return calculateEnergyCost(transaction.size);
      } catch (error: any) {
        throw new Error(`Failed to fetch data from blockchain.info API: ${error.message}`);
      }
    },
  },
  totalEnergyConsumptionPerDay: {
    type: '[Float!]!',
    args: { days: 'Int!' },
    resolve: async (_, { days }) => {
      const results = [];
      const today = new Date();
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const millis = date.getTime();

        try {
          const blocks = await fetchBlockDataByDate(millis);
          const totalEnergyConsumption = calculateTotalEnergyConsumption(blocks);
          results.push(totalEnergyConsumption);
        } catch (error: any) {
          console.error(`Failed to fetch or calculate energy consumption for date ${millis}: ${error.message}`);
          results.push(0); // Push 0 or handle the error as needed
        }
      }
      return results;
    },
  },
  totalEnergyConsumptionByAddress: {
    type: 'Float!',
    args: { address: 'String!' },
    resolve: async (_, { address }) => {
      // Implement the logic to calculate total energy consumption by address
    },
  },
});

export const schema = schemaComposer.buildSchema();