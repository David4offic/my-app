# 4office Tracking

Šitas branchas skirtas tik viešai 4office remonto užsakymų sekimo svetainei.

## Kas palikta

- pagrindinis paieškos puslapis
- status puslapis `/status/[issueKey]`
- JIRA status API integracija

## Kas išimta

- remonto registracijos forma
- DOCX ir PDF generavimas
- Word spausdinimo skriptai
- ofiso lokali spausdinimo logika

## Reikalingi environment kintamieji

```env
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
```

## Paleidimas lokaliai

```bash
npm install
npm run dev
```

## Deploy

Projektas paruoštas talpinimui ant Vercel kaip Next.js aplikacija.

## Spausdinimas ofise be PDF

Yra pridėtas MVP variantas:

- serveris pateikia kitą neatsipausdintą užduotį per `/api/print-jobs/next`
- vietinis Windows agentas `print-jobs-agent.ps1` pollina serverį
- agentas sugeneruoja paprastą Word dokumentą vietoje ir jį atspausdina
- po spausdinimo agentas pažymi Jira užduotį kaip įvykdytą

Tam reikia:

- `PRINT_AGENT_TOKEN`
- Jira label `print-pending` naujai spausdinimo užduočiai
- Word įdiegto Windows kompiuteryje
