# 4office

Šitas branchas skirtas 4office registracijos formai, Jira integracijai ir nuotoliniam spausdinimui per Windows agentą.

## Pagrindiniai srautai

- remonto registracija per formą
- Jira issue sukūrimas
- DOCX akto generavimas iš `templates/aktas.docx`
- status puslapis klientui
- spausdinimas per vietinį Windows agentą

## Environment kintamieji

```env
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
PRINT_DELIVERY_MODE=local-queue
PRINT_AGENT_TOKEN=
JIRA_PRINT_PENDING_LABEL=print-pending
JIRA_PRINT_DONE_LABEL=print-done
JIRA_PRINT_PROPERTY_KEY=four_office_print_job
AUTO_PRINT_DIR=
```

## Spausdinimo režimai

### local-queue

Serveris sugeneruoja DOCX ir padeda jį į lokalų katalogą.

### jira-agent

Serveris išsaugo print job Jira pusėje, o `print-jobs-agent.ps1`:

- pasiima kitą laukiančią užduotį
- parsisiunčia DOCX
- atspausdina per Word
- pažymi užduotį kaip įvykdytą

## Paleidimas lokaliai

```bash
npm install
npm run dev
```

## Windows print agentas

```powershell
powershell -ExecutionPolicy Bypass -File .\print-jobs-agent.ps1 -ServerBaseUrl "http://localhost:3000" -Token "YOUR_TOKEN" -PrinterName "canon 1238 buhalterija"
```
