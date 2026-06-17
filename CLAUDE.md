# PRAC CMS Deployment Rules

## STOP  Read before doing anything

Before starting ANY task in this repo, ask Shane to confirm:
1. What exactly needs to change
2. Which file(s) are involved
3. Confirm this is the right repo for the task

## This repo: PRAC-CMS-Site
- The admin CMS at admin-pattayarentacar.web.app
- Static Firebase Hosting deployment ONLY
- Deploy: npx vite build && firebase deploy --only hosting:admin-pattayarentacar --project pattaya-rent-a-car-rebuild

## The booking engine is a COMPLETELY DIFFERENT repo
- Repo: github.com/shaneruddle/Pattaya-Rent-a-Car-Rebuild-
- Deploys to Cloud Run (us-west1) via Cloud Build
- Has nothing to do with this repo
