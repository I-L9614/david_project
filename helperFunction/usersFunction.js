import express from 'express'
import fs from 'fs/promises'


export async function readUsers() {
    const users = JSON.parse(await fs.readFile('./users.json','utf8'))
    res
}