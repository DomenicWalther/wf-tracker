import os

BASE = r'D:\1 Arbeit\4 - Programmieren\2026\wf-tracker\wf-tracker\src\app\features'

# Each feature: (folder, className, title, keyPrefix, dataKey, description)
features = [
    ('quests', 'QuestsComponent', 'QUESTS', 'quest', 'quests',
     'Track your quest completion across all of Warframe\'s story content.'),
    ('lich-gear', 'LichGearComponent', 'LICH GEAR', 'lich', 'lichGear',
     'Track Kuva, Tenet, and Coda weapons. Each weapon needs to be obtained, reach 60%+ element, and achieve Elemental Vice.'),
    ('incarnon', 'IncarnonComponent', 'INCARNON', 'incarnon', 'incarnon',
     'Track Incarnon adapter acquisition and evolution across all weapon families.'),
    ('arcanes', 'ArcanesComponent', 'ARCANES', 'arcane', 'arcanes',
     'Track arcane collection. Standard: obtained & max rank. Arcane Psycho: all ranks collected.'),
    ('mods', 'ModsComponent', 'MOD COLLECTION', 'mod', 'mods',
     'Track your mod collection. Standard: owned & maxed. Mod Hoarder: all rank duplicates.'),
    ('subsume', 'SubsumeComponent', 'SUBSUMED ABILITIES', 'subsume', 'subsume',
     'Track which Warframe abilities you have subsumed into the Helminth system.'),
    ('railjack', 'RailjackComponent', 'RAILJACK', 'rj', 'railjack',
     'Track Railjack intrinsics (level 10) and component collection.'),
    ('relics', 'RelicsComponent', 'RELICS', 'relic', 'relics',
     'Track relic ownership and refinement. Standard: owned. Hoarder: Exceptional/Flawless/Radiant.'),
    ('items', 'ItemsComponent', 'ITEMS', 'item', 'items',
     'Track miscellaneous items, consumables, and resources.'),
    ('cosmetics', 'CosmeticsComponent', 'COSMETICS', 'cos', 'cosmetics',
     'Track cosmetic items across Tennogen, Prime Access, Nightwave, and more.'),
    ('collectable', 'CollectableComponent', 'COLLECTABLE', 'col', 'collectable',
     'Track glyphs, sigils, ephemera, sumdali, scenes, emblems, and more.'),
    ('decorations', 'DecorationsComponent', 'DECORATIONS', 'dec', 'decorations',
     'Track orbiter and Dojo decoration collection.'),
    ('codex', 'CodexComponent', 'CODEX', 'codex', 'codex',
     'Track codex scans for objects, enemies, fragments, somachord, frame fighter, and prex cards.'),
    ('market', 'MarketComponent', 'MARKET', 'market', 'market',
     'Track market items including emotes, animations, themes, and exclusive items.'),
    ('extra', 'ExtraComponent', 'EXTRA', 'extra', 'extra',
     'Track extra content: junctions, starchart, focus trees, arcane helmets, landing craft, and more.'),
    ('modular-gear', 'ModularGearComponent', 'MODULAR GEAR (LEGACY)', 'mod_gear', 'modularGear',
     'Track all modular gear combinations for Amps, Zaws, Kit Guns, Moas, and Hounds. This is an extreme completionist goal.'),
]

SIMPLE_TEMPLATE = '''import {{ Component, inject, OnInit, signal, computed }} from '@angular/core';
import {{ CommonModule }} from '@angular/common';
import {{ TrackerService }} from '../../core/services/tracker.service';
import {{ DataService }} from '../../core/services/data.service';
import {{ SectionHeaderComponent }} from '../../shared/components/section-header/section-header.component';
import {{ ChecklistComponent }} from '../../shared/components/checklist/checklist.component';

@Component({{
  selector: 'app-{folder}',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, ChecklistComponent],
  template: `
    <div class="page">
      <app-section-header
        title="{title}"
        description="{description}"
        [completed]="progress().completed"
        [total]="progress().total"
      />
      @if (groups().length > 0) {{
        <app-checklist
          [groups]="groups()"
          (toggle)="onToggle($event)"
          (bulkChange)="onBulkChange($event)"
        />
      }} @else {{
        <div class="loading">Loading...</div>
      }}
    </div>
  `,
  styles: [`
    .page {{ max-width: 1200px; }}
    .loading {{ padding: 40px; text-align: center; color: var(--color-text-muted); }}
  `]
}})
export class {className} implements OnInit {{
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = signal<any>(null);

  readonly groups = computed(() => {{
    const d = this.data();
    if (!d) return [];
    return this.buildGroups(d);
  }});

  readonly progress = computed(() => {{
    const items = this.groups().flatMap(g => g.items);
    const completed = items.filter(i => i.checked).length;
    return {{ completed, total: items.length }};
  }});

  ngOnInit(): void {{
    this.dataService.getData().subscribe(d => this.data.set(d));
  }}

  onToggle(key: string): void {{
    this.tracker.toggle(key);
    this.data.set({{ ...this.data() }});
  }}

  onBulkChange(event: {{ keys: string[]; value: boolean }}): void {{
    event.keys.forEach(k => {{
      if (this.tracker.isChecked(k) !== event.value) this.tracker.toggle(k);
    }});
    this.data.set({{ ...this.data() }});
  }}

  private buildGroups(d: any): any[] {{
    const raw = d['{dataKey}'];
    if (!raw) return [];
    {build_groups_body}
  }}
}}
'''

def flat_list_body(key_prefix):
    return f"""
    if (Array.isArray(raw)) {{
      return [{{
        name: 'All',
        items: (raw as string[]).map(name => ({{
          key: '{key_prefix}:' + name,
          label: name,
          checked: this.tracker.isChecked('{key_prefix}:' + name)
        }}))
      }}];
    }}
    return [];"""

def dict_of_lists_body(key_prefix):
    return f"""
    if (typeof raw === 'object' && !Array.isArray(raw)) {{
      return Object.entries(raw as Record<string, string[]>).map(([group, items]) => ({{
        name: group,
        items: items.map(name => ({{
          key: '{key_prefix}:' + name,
          label: name,
          checked: this.tracker.isChecked('{key_prefix}:' + name)
        }}))
      }}));
    }}
    return [];"""

bodies = {
    'quests': flat_list_body('quest'),
    'lich-gear': dict_of_lists_body('lich'),
    'incarnon': """
    if (Array.isArray(raw)) {
      return (raw as { name: string; weapons: string[] }[]).map(family => ({
        name: family.name,
        items: family.weapons.map(w => ({
          key: 'incarnon:' + w,
          label: w,
          checked: this.tracker.isChecked('incarnon:' + w)
        }))
      }));
    }
    return [];""",
    'arcanes': dict_of_lists_body('arcane'),
    'mods': """
    if (Array.isArray(raw)) {
      const byCategory: Record<string, { key: string; label: string; checked: boolean }[]> = {};
      for (const mod of (raw as { name: string; maxRank: number; category: string }[])) {
        const cat = mod.category || 'General';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push({
          key: 'mod:' + mod.name,
          label: mod.name + ' (R' + mod.maxRank + ')',
          checked: this.tracker.isChecked('mod:' + mod.name)
        });
      }
      return Object.entries(byCategory).map(([name, items]) => ({ name, items }));
    }
    return [];""",
    'subsume': """
    if (Array.isArray(raw)) {
      return [{
        name: 'Subsumed Abilities',
        items: (raw as { warframe: string; ability: string }[]).map(s => ({
          key: 'subsume:' + s.warframe,
          label: s.warframe + ' — ' + s.ability,
          checked: this.tracker.isChecked('subsume:' + s.warframe)
        }))
      }];
    }
    return [];""",
    'railjack': """
    if (typeof raw === 'object') {
      const groups = [];
      const intr = raw.intrinsics as string[];
      if (intr) {
        groups.push({
          name: 'Intrinsics (Level 10)',
          items: intr.map((name: string) => ({
            key: 'rj:intr:' + name,
            label: name + ' Level 10',
            checked: this.tracker.isChecked('rj:intr:' + name)
          }))
        });
      }
      const comps = raw.components as { house: string; component: string; bonus: string }[];
      if (comps) {
        const byHouse: Record<string, any[]> = {};
        for (const c of comps) {
          if (!byHouse[c.house]) byHouse[c.house] = [];
          byHouse[c.house].push({
            key: 'rj:comp:' + c.house + ':' + c.component + ':' + c.bonus,
            label: c.component + (c.bonus ? ' — ' + c.bonus : ''),
            checked: this.tracker.isChecked('rj:comp:' + c.house + ':' + c.component + ':' + c.bonus)
          });
        }
        for (const [house, items] of Object.entries(byHouse)) {
          groups.push({ name: house + ' Components', items });
        }
      }
      return groups;
    }
    return [];""",
    'relics': dict_of_lists_body('relic'),
    'items': dict_of_lists_body('item'),
    'cosmetics': """
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const groups = [];
      for (const [cat, subs] of Object.entries(raw as Record<string, Record<string, string[]>>)) {
        for (const [sub, items] of Object.entries(subs)) {
          const groupName = cat + (sub !== 'General' ? ' – ' + sub : '');
          groups.push({
            name: groupName,
            items: (items as string[]).map(name => ({
              key: 'cos:' + name,
              label: name,
              checked: this.tracker.isChecked('cos:' + name)
            }))
          });
        }
      }
      return groups;
    }
    return [];""",
    'collectable': dict_of_lists_body('col'),
    'decorations': dict_of_lists_body('dec'),
    'codex': dict_of_lists_body('codex'),
    'market': dict_of_lists_body('market'),
    'extra': dict_of_lists_body('extra'),
    'modular-gear': dict_of_lists_body('mod_gear'),
}

for folder, class_name, title, key_prefix, data_key, description in features:
    path = os.path.join(BASE, folder)
    os.makedirs(path, exist_ok=True)

    body = bodies.get(folder, flat_list_body(key_prefix))

    content = SIMPLE_TEMPLATE.format(
        folder=folder,
        className=class_name,
        title=title,
        description=description,
        dataKey=data_key,
        keyPrefix=key_prefix,
        build_groups_body=body
    )

    fname = folder.replace('-', '_') if '-' in folder else folder
    # Angular uses hyphenated filenames
    filepath = os.path.join(path, f'{folder}.component.ts')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Created: {filepath}')

print('Done!')
