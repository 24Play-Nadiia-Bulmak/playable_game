#!/usr/bin/env node

const { localExporter } = require("@24tools/ads_common");
const { resolve } = require("path");

localExporter(resolve(__dirname, "../")).parse(process.argv);
