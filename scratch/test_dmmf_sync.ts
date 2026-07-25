import { Prisma } from "../src/generated/client";

function inspectDmmfModels() {
  const models = Prisma.dmmf.datamodel.models;
  console.log("=== Prisma DMMF Models Count: " + models.length + " ===");

  const catRel = models.find(m => m.name === "CatRelationship");
  if (catRel) {
    console.log("\n--- CatRelationship DMMF Model ---");
    console.log("DB Table:", catRel.dbName);
    console.log("Fields:");
    catRel.fields.forEach(f => {
      console.log(` - ${f.name} (type: ${f.type}, kind: ${f.kind}, required: ${f.isRequired}, unique: ${f.isUnique})`);
    });
  }

  const catContact = models.find(m => m.name === "CatContact");
  if (catContact) {
    console.log("\n--- CatContact DMMF Model ---");
    console.log("DB Table:", catContact.dbName);
    console.log("Fields:");
    catContact.fields.forEach(f => {
      console.log(` - ${f.name} (type: ${f.type}, kind: ${f.kind}, required: ${f.isRequired}, unique: ${f.isUnique})`);
    });
  }
}

inspectDmmfModels();
