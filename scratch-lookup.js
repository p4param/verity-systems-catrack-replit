const fs = require('fs');
const filePath = 'src/app/(dashboard)/settings/platform/entities/components/field-dialog.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const lookupComponent = `
function LookupConfigurator({ form }: { form: any }) {
  const { register, watch, formState: { errors } } = form;
  const { data: entities = [] } = useEntities();
  const referencedEntityId = watch("lookupDefinition.referencedEntityId");

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Lookup Configuration</h4>
      
      <div>
        <label className="block text-xs font-bold text-muted-foreground mb-1">Target Entity</label>
        <select
          {...register("lookupDefinition.referencedEntityId")}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
        >
          <option value="">-- Select an entity --</option>
          {entities.map((e: any) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        {errors.lookupDefinition?.referencedEntityId && (
          <p className="text-rose-500 text-xs mt-1">{errors.lookupDefinition.referencedEntityId.message as string}</p>
        )}
      </div>

      <div className="p-3 border rounded-lg border-primary/20 bg-primary/5 text-sm text-primary">
        <p className="font-semibold mb-1">Future Enhancement</p>
        <p className="text-muted-foreground">In a future release, you will be able to select specific Display Fields, Value Fields, and Filter Conditions for this lookup.</p>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(filePath, content + lookupComponent, 'utf-8');
console.log('Appended LookupConfigurator');
