import mongoose, { Schema, Document } from "mongoose";

export interface IAccountConnection extends Document {
  metaApiToken: string;
  accountId: string;
  broker?: string;
  server?: string;
  login?: string;
  balance?: number;
  equity?: number;
  margin?: number;
  freeMargin?: number;
  currency: string;
  connected: boolean;
  botRunning: boolean;
  activeTrades: string;
  lastSignalAt?: Date;
  connectedAt: Date;
  updatedAt: Date;
}

const AccountConnectionSchema = new Schema<IAccountConnection>({
  metaApiToken: { type: String, required: true },
  accountId: { type: String, required: true },
  broker: { type: String },
  server: { type: String },
  login: { type: String },
  balance: { type: Number },
  equity: { type: Number },
  margin: { type: Number },
  freeMargin: { type: Number },
  currency: { type: String, default: "USD" },
  connected: { type: Boolean, default: false },
  botRunning: { type: Boolean, default: false },
  activeTrades: { type: String, default: "0" },
  lastSignalAt: { type: Date },
  connectedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const AccountConnection =
  (mongoose.models.AccountConnection as mongoose.Model<IAccountConnection>) ||
  mongoose.model<IAccountConnection>("AccountConnection", AccountConnectionSchema);
